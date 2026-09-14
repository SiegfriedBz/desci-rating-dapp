// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

/// @title RatingController
/// @notice On-chain request/fulfill state machine and oracle gateway for Phase-1 ratings.
contract RatingController {
    /// @notice Caller is not authorized for this action.
    error UnauthorizedCaller();
    /// @notice Oracle agent address must be non-zero.
    error InvalidOracleAgent();
    /// @notice Target UAL string must be non-empty.
    error EmptyUal();
    /// @notice R-KA UAL string must be non-empty.
    error EmptyRKaUal();
    /// @notice Score must be in range [0, 100].
    error InvalidScore();
    /// @notice A request for this UAL is already pending.
    error AlreadyPending();
    /// @notice No pending request exists for this UAL.
    error NotPending();
    /// @notice Rating phase does not allow the requested transition.
    error InvalidPhase();

    /// @notice Emitted when Phase-1 scoring is requested.
    /// @param requestId Deterministic id derived from `targetUal`.
    /// @param targetUal OriginTrail UAL of the publication to rate.
    /// @param requester Address that submitted the request.
    event Phase1Requested(bytes32 indexed requestId, string targetUal, address indexed requester);

    /// @notice Emitted when Phase-1 scoring is fulfilled by the oracle.
    /// @param requestId Deterministic id derived from `targetUal`.
    /// @param targetUal OriginTrail UAL of the rated publication.
    /// @param score Phase-1 SciScore in [0, 100].
    /// @param rKaUal OriginTrail UAL of the minted rating knowledge asset.
    event Phase1Fulfilled(bytes32 indexed requestId, string targetUal, uint8 score, string rKaUal);

    /// @notice Emitted when a pending request is cancelled.
    /// @param requestId Deterministic id derived from `targetUal`.
    /// @param targetUal OriginTrail UAL whose pending lock was cleared.
    event RequestCancelled(bytes32 indexed requestId, string targetUal);

    /// @notice Emitted when the oracle agent address is updated.
    /// @param newAgent New authorized oracle agent.
    event OracleAgentUpdated(address indexed newAgent);

    /// @notice Rating lifecycle phase for a given UAL.
    enum Phase {
        Unrated,
        Phase1Completed,
        Phase2Completed,
        Phase3Completed
    }

    /// @notice Packed rating state for a single target UAL.
    /// @dev Value fields pack into one storage slot; `rKaUal` occupies the next slot.
    struct RatingRecord {
        Phase phase;
        bool isPending;
        uint8 phase1Score;
        uint8 phase2Score;
        uint8 phase3Score;
        string rKaUal;
    }

    /// @notice Contract owner; may rotate the oracle agent and cancel pending requests.
    address public owner;

    /// @notice Authorized off-chain agent that fulfills Phase-1 results.
    address public oracleAgent;

    /// @notice Ratings keyed by `getRequestId(targetUal)`.
    mapping(bytes32 => RatingRecord) private ratings;

    /// @notice Restricts a function to the contract owner.
    modifier onlyOwner() {
        if (msg.sender != owner) revert UnauthorizedCaller();
        _;
    }

    /// @notice Restricts a function to the oracle agent.
    modifier onlyOracleAgent() {
        if (msg.sender != oracleAgent) revert UnauthorizedCaller();
        _;
    }

    /// @notice Deploys with `msg.sender` as owner and a non-zero oracle agent.
    /// @param _oracleAgent Initial authorized oracle agent.
    constructor(address _oracleAgent) {
        if (_oracleAgent == address(0)) revert InvalidOracleAgent();
        owner = msg.sender;
        oracleAgent = _oracleAgent;
    }

    /// @notice Locks a UAL and emits `Phase1Requested` for off-chain ingestion.
    /// @param targetUal OriginTrail UAL of the publication to rate.
    /// @return requestId Deterministic id for this UAL.
    function requestPhase1(string calldata targetUal) external returns (bytes32 requestId) {
        if (bytes(targetUal).length == 0) revert EmptyUal();

        requestId = getRequestId(targetUal);
        RatingRecord storage record = ratings[requestId];

        if (record.phase != Phase.Unrated) revert InvalidPhase();
        if (record.isPending) revert AlreadyPending();

        record.isPending = true;
        emit Phase1Requested(requestId, targetUal, msg.sender);
    }

    /// @notice Writes Phase-1 score and R-KA UAL, then unlocks the request.
    /// @param targetUal OriginTrail UAL of the rated publication.
    /// @param score Phase-1 SciScore in [0, 100].
    /// @param rKaUal OriginTrail UAL of the minted rating knowledge asset.
    function fulfillPhase1(string calldata targetUal, uint8 score, string calldata rKaUal)
        external
        onlyOracleAgent
    {
        bytes32 requestId = getRequestId(targetUal);
        RatingRecord storage record = ratings[requestId];

        if (!record.isPending) revert NotPending();
        if (record.phase != Phase.Unrated) revert InvalidPhase();
        if (score > 100) revert InvalidScore();
        if (bytes(rKaUal).length == 0) revert EmptyRKaUal();

        record.phase = Phase.Phase1Completed;
        record.isPending = false;
        record.phase1Score = score;
        record.rKaUal = rKaUal;

        emit Phase1Fulfilled(requestId, targetUal, score, rKaUal);
    }

    /// @notice Clears a stuck pending lock without advancing phase.
    /// @dev Callable by owner or oracle agent.
    /// @param targetUal OriginTrail UAL whose pending request should be cancelled.
    function cancelPendingRequest(string calldata targetUal) external {
        if (msg.sender != owner && msg.sender != oracleAgent) revert UnauthorizedCaller();

        bytes32 requestId = getRequestId(targetUal);
        RatingRecord storage record = ratings[requestId];

        if (!record.isPending) revert NotPending();

        record.isPending = false;
        emit RequestCancelled(requestId, targetUal);
    }

    /// @notice Updates the authorized oracle agent.
    /// @param _newOracleAgent Non-zero address of the new oracle agent.
    function setOracleAgent(address _newOracleAgent) external onlyOwner {
        if (_newOracleAgent == address(0)) revert InvalidOracleAgent();
        oracleAgent = _newOracleAgent;
        emit OracleAgentUpdated(_newOracleAgent);
    }

    /// @notice Returns the rating record for a target UAL.
    /// @param targetUal OriginTrail UAL to look up.
    /// @return Rating record for that UAL (zeroed if never requested).
    function getRatingByUal(string calldata targetUal) external view returns (RatingRecord memory) {
        return ratings[getRequestId(targetUal)];
    }

    /// @notice Returns the rating record for a request id.
    /// @param requestId Deterministic request id from `getRequestId`.
    /// @return Rating record for that id (zeroed if never requested).
    function getRating(bytes32 requestId) external view returns (RatingRecord memory) {
        return ratings[requestId];
    }

    /// @notice Derives the deterministic request id for a target UAL.
    /// @param targetUal OriginTrail UAL string.
    /// @return requestId `keccak256(abi.encodePacked(targetUal))`.
    function getRequestId(string calldata targetUal) public pure returns (bytes32 requestId) {
        return keccak256(abi.encodePacked(targetUal));
    }
}

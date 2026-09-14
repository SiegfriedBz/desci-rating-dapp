// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                     RatingController — Forge Unit Tests                    //
//                                                                            //
//  Deploy path: RatingControllerScript + HelperConfig (Anvil chain 31337).   //
//  Groups: constructor | request | fulfill | cancel | admin | views.         //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////

import {Test} from "forge-std/Test.sol";
import {RatingController} from "../src/RatingController.sol";
import {RatingControllerScript} from "../script/RatingController.s.sol";

/// @dev Shared deploy fixture for all RatingController test groups.
abstract contract RatingControllerTestBase is Test {
    /*//////////////////////////////////////////////////////////////
                               FIXTURES
    //////////////////////////////////////////////////////////////*/

    RatingController internal controller;

    address internal owner;
    address internal oracle;
    address internal stranger;

    string internal constant TARGET_UAL = "did:dkg:otp/0x1234/ual-target-1";
    string internal constant R_KA_UAL = "did:dkg:otp/0xabcd/rka-1";

    /*//////////////////////////////////////////////////////////////
                                 SETUP
    //////////////////////////////////////////////////////////////*/

    function setUp() public virtual {
        RatingControllerScript deployer = new RatingControllerScript();
        (controller,) = deployer.run();

        owner = controller.owner();
        oracle = controller.oracleAgent();
        stranger = makeAddr("stranger");
    }

    /*//////////////////////////////////////////////////////////////
                               HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Corrupt packed RatingRecord slot 0: set phase while leaving isPending intact.
    function _forcePhaseWhilePending(string memory targetUal, RatingController.Phase phase) internal {
        bytes32 requestId = controller.getRequestId(targetUal);
        // `ratings` mapping is storage slot 2 (after owner, oracleAgent).
        bytes32 mapSlot = keccak256(abi.encode(requestId, uint256(2)));
        bytes32 packed = vm.load(address(controller), mapSlot);
        packed = bytes32((uint256(packed) & ~uint256(0xff)) | uint256(uint8(phase)));
        vm.store(address(controller), mapSlot, packed);
    }
}

/*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
//////////////////////////////////////////////////////////////*/

contract RatingControllerConstructorTest is RatingControllerTestBase {
    function test_Constructor_RevertIf_ZeroAddress() public {
        vm.expectRevert(RatingController.InvalidOracleAgent.selector);
        new RatingController(address(0));
    }
}

/*//////////////////////////////////////////////////////////////
                           REQUEST PHASE 1
//////////////////////////////////////////////////////////////*/

contract RatingControllerRequestTest is RatingControllerTestBase {
    function test_RequestPhase1_Success() public {
        bytes32 expectedId = controller.getRequestId(TARGET_UAL);

        vm.expectEmit(true, true, false, true);
        emit RatingController.Phase1Requested(expectedId, TARGET_UAL, stranger);

        vm.prank(stranger);
        bytes32 requestId = controller.requestPhase1(TARGET_UAL);

        assertEq(requestId, expectedId);

        RatingController.RatingRecord memory record = controller.getRatingByUal(TARGET_UAL);
        assertTrue(record.isPending);
        assertEq(uint8(record.phase), uint8(RatingController.Phase.Unrated));
    }

    function test_RequestPhase1_RevertIf_EmptyUal() public {
        vm.expectRevert(RatingController.EmptyUal.selector);
        controller.requestPhase1("");
    }

    function test_RequestPhase1_RevertIf_AlreadyPending() public {
        controller.requestPhase1(TARGET_UAL);

        vm.expectRevert(RatingController.AlreadyPending.selector);
        controller.requestPhase1(TARGET_UAL);
    }

    function test_RequestPhase1_RevertIf_InvalidPhase() public {
        controller.requestPhase1(TARGET_UAL);

        vm.prank(oracle);
        controller.fulfillPhase1(TARGET_UAL, 50, R_KA_UAL);

        vm.expectRevert(RatingController.InvalidPhase.selector);
        controller.requestPhase1(TARGET_UAL);
    }
}

/*//////////////////////////////////////////////////////////////
                           FULFILL PHASE 1
//////////////////////////////////////////////////////////////*/

contract RatingControllerFulfillTest is RatingControllerTestBase {
    function test_FulfillPhase1_Success() public {
        controller.requestPhase1(TARGET_UAL);

        bytes32 expectedId = controller.getRequestId(TARGET_UAL);
        vm.expectEmit(true, false, false, true);
        emit RatingController.Phase1Fulfilled(expectedId, TARGET_UAL, 87, R_KA_UAL);

        vm.prank(oracle);
        controller.fulfillPhase1(TARGET_UAL, 87, R_KA_UAL);

        RatingController.RatingRecord memory record = controller.getRatingByUal(TARGET_UAL);
        assertEq(uint8(record.phase), uint8(RatingController.Phase.Phase1Completed));
        assertFalse(record.isPending);
        assertEq(record.phase1Score, 87);
        assertEq(record.rKaUal, R_KA_UAL);
    }

    function test_FulfillPhase1_Success_BoundaryScores() public {
        string memory ualZero = string.concat(TARGET_UAL, "-score-0");
        controller.requestPhase1(ualZero);
        vm.prank(oracle);
        controller.fulfillPhase1(ualZero, 0, R_KA_UAL);
        assertEq(controller.getRatingByUal(ualZero).phase1Score, 0);

        string memory ualMax = string.concat(TARGET_UAL, "-score-100");
        controller.requestPhase1(ualMax);
        vm.prank(oracle);
        controller.fulfillPhase1(ualMax, 100, R_KA_UAL);
        assertEq(controller.getRatingByUal(ualMax).phase1Score, 100);
    }

    function test_FulfillPhase1_RevertIf_Unauthorized() public {
        controller.requestPhase1(TARGET_UAL);

        vm.prank(stranger);
        vm.expectRevert(RatingController.UnauthorizedCaller.selector);
        controller.fulfillPhase1(TARGET_UAL, 50, R_KA_UAL);
    }

    function test_FulfillPhase1_RevertIf_NotPending() public {
        vm.prank(oracle);
        vm.expectRevert(RatingController.NotPending.selector);
        controller.fulfillPhase1(TARGET_UAL, 50, R_KA_UAL);
    }

    function test_FulfillPhase1_RevertIf_InvalidPhase() public {
        controller.requestPhase1(TARGET_UAL);
        _forcePhaseWhilePending(TARGET_UAL, RatingController.Phase.Phase1Completed);

        vm.prank(oracle);
        vm.expectRevert(RatingController.InvalidPhase.selector);
        controller.fulfillPhase1(TARGET_UAL, 50, R_KA_UAL);
    }

    function test_FulfillPhase1_RevertIf_InvalidScore() public {
        controller.requestPhase1(TARGET_UAL);

        vm.prank(oracle);
        vm.expectRevert(RatingController.InvalidScore.selector);
        controller.fulfillPhase1(TARGET_UAL, 101, R_KA_UAL);
    }

    function test_FulfillPhase1_RevertIf_EmptyRKaUal() public {
        controller.requestPhase1(TARGET_UAL);

        vm.prank(oracle);
        vm.expectRevert(RatingController.EmptyRKaUal.selector);
        controller.fulfillPhase1(TARGET_UAL, 50, "");
    }
}

/*//////////////////////////////////////////////////////////////
                        CANCEL PENDING REQUEST
//////////////////////////////////////////////////////////////*/

contract RatingControllerCancelTest is RatingControllerTestBase {
    function test_CancelPendingRequest_Success_AsOwner() public {
        controller.requestPhase1(TARGET_UAL);

        bytes32 expectedId = controller.getRequestId(TARGET_UAL);
        vm.expectEmit(true, false, false, true);
        emit RatingController.RequestCancelled(expectedId, TARGET_UAL);

        vm.prank(owner);
        controller.cancelPendingRequest(TARGET_UAL);

        RatingController.RatingRecord memory record = controller.getRatingByUal(TARGET_UAL);
        assertFalse(record.isPending);
        assertEq(uint8(record.phase), uint8(RatingController.Phase.Unrated));

        controller.requestPhase1(TARGET_UAL);
        assertTrue(controller.getRatingByUal(TARGET_UAL).isPending);
    }

    function test_CancelPendingRequest_Success_AsOracle() public {
        controller.requestPhase1(TARGET_UAL);

        vm.prank(oracle);
        controller.cancelPendingRequest(TARGET_UAL);

        assertFalse(controller.getRatingByUal(TARGET_UAL).isPending);
    }

    function test_CancelPendingRequest_RevertIf_Unauthorized() public {
        controller.requestPhase1(TARGET_UAL);

        vm.prank(stranger);
        vm.expectRevert(RatingController.UnauthorizedCaller.selector);
        controller.cancelPendingRequest(TARGET_UAL);
    }

    function test_CancelPendingRequest_RevertIf_NotPending() public {
        vm.prank(owner);
        vm.expectRevert(RatingController.NotPending.selector);
        controller.cancelPendingRequest(TARGET_UAL);
    }
}

/*//////////////////////////////////////////////////////////////
                          ADMIN / ORACLE
//////////////////////////////////////////////////////////////*/

contract RatingControllerAdminTest is RatingControllerTestBase {
    function test_SetOracleAgent_Success() public {
        address newOracle = makeAddr("newOracle");

        vm.expectEmit(true, false, false, true);
        emit RatingController.OracleAgentUpdated(newOracle);

        vm.prank(owner);
        controller.setOracleAgent(newOracle);

        assertEq(controller.oracleAgent(), newOracle);
    }

    function test_SetOracleAgent_RevertIf_NotOwner() public {
        vm.prank(stranger);
        vm.expectRevert(RatingController.UnauthorizedCaller.selector);
        controller.setOracleAgent(makeAddr("newOracle"));
    }

    function test_SetOracleAgent_RevertIf_ZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(RatingController.InvalidOracleAgent.selector);
        controller.setOracleAgent(address(0));
    }
}

/*//////////////////////////////////////////////////////////////
                               VIEWS
//////////////////////////////////////////////////////////////*/

contract RatingControllerViewsTest is RatingControllerTestBase {
    function test_Getters() public {
        controller.requestPhase1(TARGET_UAL);

        vm.prank(oracle);
        controller.fulfillPhase1(TARGET_UAL, 42, R_KA_UAL);

        bytes32 requestId = controller.getRequestId(TARGET_UAL);
        RatingController.RatingRecord memory byUal = controller.getRatingByUal(TARGET_UAL);
        RatingController.RatingRecord memory byId = controller.getRating(requestId);

        assertEq(uint8(byUal.phase), uint8(byId.phase));
        assertEq(byUal.isPending, byId.isPending);
        assertEq(byUal.phase1Score, byId.phase1Score);
        assertEq(byUal.rKaUal, byId.rKaUal);
        assertEq(byUal.phase1Score, 42);
        assertEq(byUal.rKaUal, R_KA_UAL);
        assertEq(uint8(byUal.phase), uint8(RatingController.Phase.Phase1Completed));
    }
}

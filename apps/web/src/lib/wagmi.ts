import { BASE_SEPOLIA_CHAIN_ID } from "@desci/shared";
import { baseSepolia } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { cookieStorage, createStorage } from "wagmi";

/** Optional — missing key must not fail build; header shows a configure hint. */
export const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim() || undefined;

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [baseSepolia];

export const expectedChainId = BASE_SEPOLIA_CHAIN_ID;

export const metadata = {
  name: "VeriSci",
  description:
    "Rate scientific Knowledge Assets on OriginTrail DKG — Base Sepolia Phase 1",
  url: "http://localhost:3000",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

export const wagmiAdapter = projectId
  ? new WagmiAdapter({
      storage: createStorage({ storage: cookieStorage }),
      ssr: true,
      projectId,
      networks,
    })
  : null;

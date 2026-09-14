import { BASE_SEPOLIA_CHAIN_ID } from "@desci/shared";
import { reownProjectId } from "@desci/env/client";
import { baseSepolia } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { cookieStorage, createStorage } from "wagmi";
import { clientEnv } from "@desci/env/client";


/** Optional — missing key must not fail build; header shows a configure hint. */
export const projectId = reownProjectId;

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [baseSepolia];

export const expectedChainId = BASE_SEPOLIA_CHAIN_ID;

const appUrl = clientEnv.NEXT_PUBLIC_APP_URL

export const metadata = {
  name: "VeriSci",
  description:
    "Rate scientific Knowledge Assets on OriginTrail DKG — Base Sepolia Phase 1",
    url: appUrl ?? "http://localhost:3000",
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

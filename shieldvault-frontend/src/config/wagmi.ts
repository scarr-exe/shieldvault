import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "shieldvault-demo";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [sepolia.id]: http(
      import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org"
    ),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

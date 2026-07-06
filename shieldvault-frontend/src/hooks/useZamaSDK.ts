import { useMemo } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ZamaSDK, RelayerWeb, indexedDBStorage } from "@zama-fhe/react-sdk";
import { ViemSigner } from "@zama-fhe/sdk/viem";
import { ADDRESSES } from "../config/contracts";

export function useZamaSDK(): ZamaSDK | null {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: sepolia.id });

  return useMemo(() => {
    if (!walletClient || !publicClient) return null;

    const rpcUrl =
      import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

    return new ZamaSDK({
      relayer: new RelayerWeb({
        getChainId: () => Promise.resolve(sepolia.id),
        transports: {
          [sepolia.id]: {
            relayerUrl: ADDRESSES.relayerUrl,
            network: rpcUrl,
          },
        },
      }),
      signer: new ViemSigner({ walletClient, publicClient }),
      storage: indexedDBStorage,
    });
  }, [walletClient, publicClient]);
}

// Sends a confidential transfer directly from the connected wallet
// The SDK handles all encryption internally — amount never appears in cleartext on-chain
export async function sendConfidentialPayment(
  sdk: ZamaSDK,
  confidentialTokenAddress: string,
  recipient: string,
  amountBigInt: bigint,
): Promise<void> {
  const token = sdk.createToken(confidentialTokenAddress);
  const tx = await token.confidentialTransfer(recipient, amountBigInt);

  // Wait for receipt and check status
  if (tx && typeof tx.wait === "function") {
    const receipt = await tx.wait();
    if (receipt?.status === 0) {
      throw new Error(
        "Transaction reverted — check your confidential token balance",
      );
    }
  }
}

// Decrypts the caller's own balance for a confidential token.
// Requires an EIP-712 signature — only the signer can decrypt their own balance.
export async function decryptOwnBalance(
  sdk: ZamaSDK,
  confidentialTokenAddress: string
): Promise<bigint> {
  const token = sdk.createToken(confidentialTokenAddress);
  const balance = await token.balanceOf(); // triggers userDecrypt internally
  return balance;
}

export async function unshieldAndWait(
  sdk: ZamaSDK,
  wrapperAddress: string,
  amountBigInt: bigint,
): Promise<void> {
  const token = sdk.createToken(wrapperAddress);

  // Step 1: request the unwrap
  await token.unshield(amountBigInt);

  // Step 2: the SDK should auto-finalize in the background.
  // Some versions need a manual poll. If your balance doesn't
  // update within a minute, the relayer may need more time,
  // or a separate finalize call is required on this SDK version.
}
import { Address, createPublicClient, createWalletClient, Hex, http } from "viem";
import { CHAIN, rpcUrl, USER_PK } from "./constants";
import { privateKeyToAccount } from "viem/accounts";

const userClient = createWalletClient({
  chain: CHAIN,
  transport: http(rpcUrl),
  account: privateKeyToAccount(USER_PK),
});

const publicClient = createPublicClient({
  transport: http(rpcUrl),
  chain: CHAIN,
});

export async function sendTransaction(to: Address, data: Hex) {
  return await userClient.sendTransaction({
      account: userClient.account,
      chain: CHAIN,
      to: to,
      data: data,
    });
}

export { userClient, publicClient };
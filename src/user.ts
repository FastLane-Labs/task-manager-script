import { createPublicClient, createWalletClient, http } from "viem";
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

export { userClient, publicClient };
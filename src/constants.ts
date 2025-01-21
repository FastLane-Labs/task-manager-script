import { Chain, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

dotenv.config();

const USER_PK = process.env.USER_PK as Hex;
const eoa = privateKeyToAccount(USER_PK);
const chain = process.env.CHAIN_ID as Hex;
const rpcUrl = process.env.RPC_URL as Hex;
const taskManagerAddress = process.env.TASK_MANAGER as Hex;
const shMonadAddress = process.env.SHMONAD as Hex;

const CHAIN: Chain = {
  id: Number(chain),
  name: 'Monad Devnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'DMON',
  },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] },
  },
};

export { USER_PK, eoa, CHAIN, rpcUrl, taskManagerAddress, shMonadAddress };

import taskmanagerAbi from "./abi/taskmanager.json";
import shmonadAbi from "./abi/shmonad.json";
import { getContract } from "viem";
import { userClient } from "./user";
import { taskManagerAddress, shMonadAddress } from "./constants";

const taskManagerContract = getContract({
  address: taskManagerAddress,
  abi: taskmanagerAbi,
  client: {
    public: userClient,
    account: userClient.account,
  },
});

const shMonadContract = getContract({
  address: shMonadAddress,
  abi: shmonadAbi,
  client: {
    public: userClient,
    account: userClient.account,
  },
});

export { taskManagerContract, shMonadContract };
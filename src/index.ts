import { encodeFunctionData, Hex } from "viem";
import { taskManagerContract, shMonadContract } from "./contracts";
import { CHAIN, eoa, shMonadAddress, taskManagerAddress } from "./constants";
import shmonadAbi from "./abi/shmonad.json";
import taskManagerAbi from "./abi/taskmanager.json";
import { userClient, publicClient } from "./user";
import { PolicyBond } from "./types";

const policyId = await taskManagerContract.read.POLICY_ID();
console.log("Policy ID:", policyId);

const nonce = await taskManagerContract.read.getAccountNonce([eoa.address]);
console.log("Nonce:", nonce);

const depositedAmount = await shMonadContract.read.balanceOf([eoa.address]);
console.log("Currently deposited amount:", depositedAmount);

const bondedAmount = await shMonadContract.read.balanceOfBonded([policyId, eoa.address]) as bigint;
console.log("Currently bonded amount:", bondedAmount);

const currentBlockNumber = await publicClient.getBlockNumber();
console.log("Current block number:", currentBlockNumber);

const getPolicyBond = await shMonadContract.read.getPolicyBond([policyId, eoa.address]) as PolicyBond;
console.log("Unbonding Amount:", getPolicyBond.unbonding);

const unbondAmount = BigInt(10000000000000);
const data = encodeFunctionData({
    abi: shmonadAbi,
    functionName: "unbond",
    args: [policyId, unbondAmount],
});

// const hash = await userClient.sendTransaction({
//     account: eoa,
//     chain: CHAIN,
//     to: shMonadAddress,
//     data: data,
//   });

// console.log(hash);

const task = {
    from: eoa.address,
    gas: BigInt(100000),
    target: shMonadAddress,
    data,
    nonce,
}

const schedule = {
    startBlock: currentBlockNumber+BigInt(10),
    interval: BigInt(100),
    executions: 10,
    active: true,
    deadline: currentBlockNumber + BigInt(5000),
}

const taskDefinition = {
    task,
    schedule,
}

// const simulate = await taskManagerContract.simulate.scheduleTask([taskDefinition]);
// console.log(simulate.result);

// const taskData = encodeFunctionData({
//     abi: taskManagerAbi,
//     functionName: "scheduleTask",
//     args: [taskDefinition],
// });

// const hash = await userClient.sendTransaction({
//     account: eoa,
//     chain: CHAIN,
//     to: taskManagerAddress,
//     data: taskData,
//   });

// console.log(hash);

const accountTasks = await taskManagerContract.read.getAccountTasks([eoa.address]) as Hex[];
console.log(accountTasks);

const taskInfo = await taskManagerContract.read.getTaskInfo([accountTasks[0]]);
console.log(taskInfo);




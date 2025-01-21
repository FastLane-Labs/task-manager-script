import { encodeFunctionData } from "viem";
import { taskManagerContract, shMonadContract } from "./contracts";
import { CHAIN, eoa, shMonadAddress, taskManagerAddress } from "./constants";
import shmonadAbi from "./abi/shmonad.json";
import taskManagerAbi from "./abi/taskmanager.json";
import { userClient, publicClient } from "./user";


const nonce = await taskManagerContract.read.getAccountNonce([eoa.address]);
const policyId = 2;
const depositedAmount = await shMonadContract.read.balanceOf([eoa.address]);
console.log("Currently deposited amount:", depositedAmount);
const currentBlockNumber = await publicClient.getBlockNumber();
const amount = BigInt(100000000000000);
const data = encodeFunctionData({
    abi: shmonadAbi,
    functionName: "bond",
    args: [policyId, amount],
});

const simulate = await shMonadContract.simulate.bond([policyId, amount]);
console.log(simulate);

const task = {
    from: eoa.address,
    gas: BigInt(500000),
    target: shMonadAddress,
    data,
    nonce: nonce,
}

const schedule = {
    startBlock: currentBlockNumber+BigInt(3),
    interval: BigInt(1000),
    executions: 2,
    active: true,
    deadline: currentBlockNumber + BigInt(5000),
}

const taskDefinition = {
    task,
    schedule,
}

const simulate2 = await taskManagerContract.simulate.executeAndSchedule([taskDefinition]);
console.log(simulate2);

// const taskData = encodeFunctionData({
//     abi: taskManagerAbi,
//     functionName: "executeAndSchedule",
//     args: [taskDefinition],
// });

// const hash = await userClient.sendTransaction({
//     account: eoa,
//     chain: CHAIN,
//     to: taskManagerAddress,
//     data: taskData,
//     value: amount,
//     gas: BigInt(1000000),
//     maxFeePerGas: BigInt(100000000000),
//     maxPriorityFeePerGas: BigInt(10000000000),
//   });

// console.log(hash);
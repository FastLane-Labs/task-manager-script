import { encodeFunctionData, Hex } from "viem";
import { taskManagerContract, shMonadContract } from "./contracts";
import { eoa, shMonadAddress, taskManagerAddress } from "./constants";
import shmonadAbi from "./abi/shmonad.json";
import taskManagerAbi from "./abi/taskmanager.json";
import { publicClient, sendTransaction } from "./user";
import { PolicyBond } from "./types";

//general
const currentBlockNumber = await publicClient.getBlockNumber();
console.log("Current block number:", currentBlockNumber);

//Task Manager
const policyId = await taskManagerContract.read.POLICY_ID();
console.log("Policy ID:", policyId);

const nonce = await taskManagerContract.read.getAccountNonce([eoa.address]);
console.log("Nonce:", nonce);

//ShMonad
//The task manager is an agent (with a policy) in the shMonad contract, so you need to 
//bond shMON to the policy to schedule tasks
const depositedAmount = await shMonadContract.read.balanceOf([eoa.address]);
console.log("shMonad Deposited Amount:", depositedAmount);

const policyBond = await shMonadContract.read.getPolicyBond([policyId, eoa.address]) as PolicyBond;
console.log("Policy Unbonding Amount:", policyBond.unbonding);
console.log("Policy Bonded Amount:", policyBond.bonded);

//Schedule a task
//Scheduling a task to unbond my shMON from the Task Manager Policy, but this could
//be for activity like dollar cost averaging, recurring payments, etc.
const unbondAmount = BigInt(10000000000000);
const data = encodeFunctionData({
    abi: shmonadAbi,
    functionName: "unbond",
    args: [policyId, unbondAmount],
});

//Build the task
const task = {
    from: eoa.address,
    gas: BigInt(100000),
    target: shMonadAddress,
    data,
    nonce,
}

//Schedule the task
const schedule = {
    startBlock: currentBlockNumber+BigInt(10),
    interval: BigInt(100),
    executions: 10,
    active: true,
    deadline: currentBlockNumber + BigInt(5000),
}

//Build the task definition
const taskDefinition = {
    task,
    schedule,
}

//Simulate the task to make sure it works
const scheduleSimulate  = await taskManagerContract.simulate.scheduleTask([taskDefinition]);
const taskHash = scheduleSimulate.result;
console.log("Task Hash:", taskHash);

//Build the task data
const scheduleTaskData = encodeFunctionData({
    abi: taskManagerAbi,
    functionName: "scheduleTask",
    args: [taskDefinition],
});

//Send it!
const scheduleTaskHash = await sendTransaction(taskManagerAddress, scheduleTaskData);
console.log("Schedule Tx Hash:", scheduleTaskHash);

//Retrieve your tasks
const accountTasks = await taskManagerContract.read.getAccountTasks([eoa.address]) as Hex[];
const lastTaskHash = accountTasks[accountTasks.length-1] as Hex;
console.log("Last Task Hash:", lastTaskHash);

//Schedule the new task
const newSchedule = {
    startBlock: currentBlockNumber+BigInt(10),
    interval: BigInt(1000), //UPDATED INTERVAL TO 1000 blocks
    executions: 10,
    active: true,
    deadline: currentBlockNumber + BigInt(5000),
}

//Build the new task schedule
const newTaskDefinition = {
    task,
    schedule: newSchedule,
}

//Update the task schedule
const updateTaskSchedule = await taskManagerContract.simulate.updateTaskSchedule([lastTaskHash, newTaskDefinition]);

//Build the task data
const updateTaskScheduleData = encodeFunctionData({
    abi: taskManagerAbi,
    functionName: "updateTaskSchedule",
    args: [lastTaskHash, newTaskDefinition],
});

//Send it!
const updateTaskScheduleHash = await sendTransaction(taskManagerAddress, updateTaskScheduleData);
console.log("Update Task Schedule Tx Hash:", updateTaskScheduleHash);

//Cancel a task
const cancelSimulate = await taskManagerContract.simulate.cancelTask([lastTaskHash]);

//Build the task data
const cancelTaskData = encodeFunctionData({
    abi: taskManagerAbi,
    functionName: "cancelTask",
    args: [lastTaskHash],
});

//Send it!
const cancelTaskHash = await sendTransaction(taskManagerAddress, cancelTaskData);
console.log("Cancel Tx Hash:", cancelTaskHash);

//Retrieve the task info
const taskInfo = await taskManagerContract.read.getTaskInfo([lastTaskHash]);
console.log(taskInfo);





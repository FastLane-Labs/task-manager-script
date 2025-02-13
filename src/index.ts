import { encodeFunctionData, createPublicClient, http, formatUnits, createWalletClient } from "viem";
import { TaskManagerHelper } from "./utils/taskManager";
import { AddressHubHelper } from "./utils/addressHub";
import { CHAIN, eoa } from "./constants";
import shmonadAbi from "./abi/shmonad.json";
import dotenv from "dotenv";
import chalk from "chalk";
import { PolicyBond, TaskDefinition } from "./types";
import { ShmonadHelper } from "./utils/shmonad";

dotenv.config();

const ADDRESS_HUB = process.env.ADDRESS_HUB;
const RPC_URL = process.env.RPC_URL;

if (!ADDRESS_HUB || !RPC_URL) {
  throw new Error('Required environment variables not found');
}

async function main() {
  console.log(chalk.blue('Creating clients...'));
  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(RPC_URL)
  });

  // Get contract addresses from hub
  const addressHub = new AddressHubHelper(
    ADDRESS_HUB as `0x${string}`,
    publicClient
  );

  const taskManagerAddress = await addressHub.getTaskManagerAddress();
  const shmonadAddress = await addressHub.getShmonadAddress();

  console.log(chalk.blue('Contract Addresses:'));
  console.log(chalk.blue('Task Manager:'), chalk.yellow(taskManagerAddress));
  console.log(chalk.blue('Shmonad:     '), chalk.yellow(shmonadAddress));

  // Create TaskManager helper
  const taskManager = new TaskManagerHelper(
    taskManagerAddress,
    publicClient,
    {} as any // We'll need to add proper wallet client for writes
  );

  // Get current state
  const currentBlock = await publicClient.getBlockNumber();
  console.log(chalk.blue('\nCurrent block:'), chalk.green(currentBlock.toString()));

  const policyId = await taskManager.contract.read.POLICY_ID() as bigint;
  console.log(chalk.blue('Policy ID:'), chalk.green(policyId.toString()));

  // Get account nonce
  const nonce = await taskManager.contract.read.S_accountNonces([eoa.address]) as bigint;
  console.log(chalk.blue('Nonce:'), chalk.green(nonce.toString()));

  // Create wallet client
  const walletClient = createWalletClient({
    account: eoa,
    chain: CHAIN,
    transport: http(RPC_URL)
  });

  // Create Shmonad helper
  const shmonad = new ShmonadHelper(
    shmonadAddress,
    publicClient,
    walletClient
  );

  // Get balances
  const nativeBalance = await shmonad.getNativeBalance(eoa.address);
  const depositedAmount = await shmonad.getBalance(eoa.address);
  
  console.log(chalk.blue('\nBalances:'));
  console.log(chalk.blue('Native Balance:'), chalk.green(`${formatUnits(nativeBalance, 18)} MON`));
  console.log(chalk.blue('shMonad Balance:'), chalk.green(`${formatUnits(depositedAmount, 18)} shMON`));

  const policyBond = await shmonad.getPolicyBond(policyId, eoa.address);
  console.log(chalk.blue('Policy Unbonding Amount:'), chalk.green(`${formatUnits(policyBond.unbonding, 18)} shMON`));
  console.log(chalk.blue('Policy Bonded Amount:'), chalk.green(`${formatUnits(policyBond.bonded, 18)} shMON`));

  // First calculate estimated cost
  const task = {
    from: eoa.address,
    gas: BigInt(100000),
    target: shmonadAddress,
    data: encodeFunctionData({
      abi: shmonadAbi,
      functionName: "unbond",
      args: [policyId, eoa.address, BigInt(10000000000000)],
    }),
    nonce,
  };

  const schedule = {
    startBlock: currentBlock + BigInt(10),
    interval: BigInt(100),
    executions: 10,
    active: true,
    deadline: currentBlock + BigInt(5000),
  };

  console.log(chalk.blue('\nSimulating task scheduling...'));
  const estimatedCost = await taskManager.estimateTaskCost(schedule.startBlock, task.gas);
  console.log(chalk.blue('Estimated cost:'), chalk.green(`${formatUnits(estimatedCost, 18)} MON`));

  // Then check bond requirements (should be greater than estimated cost)
  const requiredBond = estimatedCost * BigInt(2); // 2x safety margin
  
  if (!await shmonad.waitForSufficientBond(policyId, eoa.address, requiredBond)) {
    console.log(chalk.yellow('\nWarning: Insufficient bonded balance. Need to depositAndBond first.'));
    try {
      const txHash = await shmonad.depositAndBond(
        policyId,
        eoa.address,
        requiredBond
      );
      console.log(chalk.green('\nWaiting for transaction confirmation...'));
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(chalk.green('Transaction confirmed!'));
    } catch (error) {
      console.error(chalk.red('Failed to deposit and bond:'), error);
      return;
    }
  }

  const taskDefinition: TaskDefinition = {
    task,
    schedule,
  };

  // Note: Actual scheduling would require wallet setup
  console.log(chalk.yellow('\nNote: Task scheduling requires wallet setup'));
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
});





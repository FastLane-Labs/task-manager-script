import { 
  Address, 
  PublicClient, 
  WalletClient,
  getContract,
  decodeEventLog
} from 'viem';
import taskManagerAbi from '../abi/taskmanager.json';
import chalk from 'chalk';

export class TaskManagerHelper {
  public contract;
  private publicClient: PublicClient;
  private walletClient: WalletClient | null;

  constructor(
    address: Address,
    publicClient: PublicClient,
    walletClient: WalletClient | null
  ) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.contract = getContract({
      address,
      abi: taskManagerAbi,
      client: {
        public: publicClient,
        wallet: walletClient,
        account: walletClient?.account,
      }
    });
  }

  async estimateTaskCost(
    targetBlock: bigint,
    gasLimit: bigint
  ): Promise<bigint> {
    return await this.contract.read.estimateCost([targetBlock, gasLimit]) as bigint;
  }

  async scheduleTask(taskDefinition: TaskDefinition): Promise<`0x${string}`> {
    if (!this.walletClient) {
      throw new Error('Wallet client required for scheduling');
    }

    console.log(chalk.blue('\nSubmitting schedule task transaction...'));
    const hash = await this.contract.write.scheduleTask([
      taskDefinition.task.target,  // implementation/environment address
      taskDefinition.task.gas,     // taskGasLimit
      taskDefinition.schedule.startBlock, // targetBlock
      await this.estimateTaskCost(taskDefinition.schedule.startBlock, taskDefinition.task.gas), // maxPayment
      taskDefinition.task.data,    // taskCallData
    ], {
      value: await this.estimateTaskCost(taskDefinition.schedule.startBlock, taskDefinition.task.gas)
    });
    
    console.log(chalk.green('Transaction submitted:'), chalk.yellow(hash));
    return hash;
  }

  async executeTasks(
    payoutAddress: Address,
    targetGasReserve: bigint = 0n
  ) {
    const hash = await this.contract.write.executeTasks([payoutAddress, targetGasReserve]);

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    const executedEvent = receipt.logs.find(log => {
      try {
        const event = decodeEventLog({
          abi: taskManagerAbi,
          data: log.data,
          topics: log.topics,
        });
        return event.eventName === 'TasksExecuted';
      } catch {
        return false;
      }
    });

    if (!executedEvent) {
      throw new Error('Task execution failed - no TasksExecuted event found');
    }

    const { eventName, args } = decodeEventLog({
      abi: taskManagerAbi,
      data: executedEvent.data,
      topics: executedEvent.topics,
      eventName: 'TasksExecuted'
    });

    return {
      executed: args?.[0] as bigint,
      failed: args?.[1] as bigint
    };
  }

  async isTaskExecuted(taskId: `0x${string}`): Promise<boolean> {
    return await this.contract.read.isTaskExecuted([taskId]) as boolean;
  }

  async isTaskCancelled(taskId: `0x${string}`): Promise<boolean> {
    return await this.contract.read.isTaskCancelled([taskId]) as boolean;
  }

  async getNextExecutionBlock(
    startBlock: bigint,
    endBlock: bigint
  ): Promise<bigint> {
    return await this.contract.read.getNextExecutionBlockInRange([startBlock, endBlock]) as bigint;
  }
} 
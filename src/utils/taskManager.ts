import { 
  Address, 
  PublicClient, 
  WalletClient,
  getContract,
  decodeEventLog
} from 'viem';
import taskManagerAbi from '../abi/taskmanager.json';

export class TaskManagerHelper {
  public contract;
  private publicClient: PublicClient;

  constructor(
    address: Address,
    publicClient: PublicClient,
    walletClient: WalletClient
  ) {
    this.publicClient = publicClient;
    this.contract = getContract({
      address,
      abi: taskManagerAbi,
      client: {
        public: publicClient,
        wallet: walletClient,
        account: walletClient.account,
      }
    });
  }

  async estimateTaskCost(
    targetBlock: bigint,
    gasLimit: bigint
  ): Promise<bigint> {
    return await this.contract.read.estimateCost([targetBlock, gasLimit]) as bigint;
  }

  async scheduleTask(
    environment: Address,
    gasLimit: bigint,
    targetBlock: bigint,
    maxPayment: bigint,
    taskData: `0x${string}`
  ) {
    const hash = await this.contract.write.scheduleTask(
      [environment, gasLimit, targetBlock, maxPayment, taskData],
      { value: maxPayment }
    );

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    
    const scheduledEvent = receipt.logs.find(log => {
      try {
        const event = decodeEventLog({
          abi: taskManagerAbi,
          data: log.data,
          topics: log.topics,
        });
        return event.eventName === 'TaskScheduled';
      } catch {
        return false;
      }
    });

    if (!scheduledEvent) {
      throw new Error('Task scheduling failed - no TaskScheduled event found');
    }

    const { eventName, args } = decodeEventLog({
      abi: taskManagerAbi,
      data: scheduledEvent.data,
      topics: scheduledEvent.topics,
      eventName: 'TaskScheduled'
    });

    return {
      taskId: args?.[0] as `0x${string}`,
      owner: args?.[1] as `0x${string}`,
      targetBlock: args?.[2] as bigint
    };
  }

  async executeTasks(
    payoutAddress: Address,
    targetGasReserve: bigint = 0n
  ) {
    console.log('Attempting to submit executeTasks transaction...');
    let hash;
    try {
      hash = await this.contract.write.executeTasks([payoutAddress, targetGasReserve]);
      console.log('Got transaction hash:', hash);
    } catch (error) {
      console.error('Failed to submit transaction:', error);
      throw error;
    }
    
    console.log('Waiting for transaction confirmation...');
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    console.log('Transaction confirmed:', hash);

    console.log('Looking for TasksExecuted event...');
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

    const { args } = decodeEventLog({
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
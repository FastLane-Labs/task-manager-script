import { Address, Hex } from 'viem';

export interface PolicyBond {
  unbonding: bigint;
  bonded: bigint;
}

export interface Task {
  from: Address;
  gas: bigint;
  target: Address;
  data: `0x${string}`;
}

export interface Schedule {
  startBlock: bigint;
  interval: bigint;
  executions: number;
  active: boolean;
  deadline: bigint;
}

export interface TaskDefinition {
  task: Task;
  schedule: Schedule;
}

// Interface for TaskScheduled event from viem decodeEventLog
export interface TaskScheduledEvent {
  eventName: 'TaskScheduled';
  args: {
    taskId: Hex;
    [key: string]: unknown;
  } | readonly unknown[];
}


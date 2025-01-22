import { Hex } from "viem";

export interface Task {
  from: Hex;
  gas: bigint;
  target: Hex;
  data: Hex;
  nonce: bigint;
}

export interface TaskSchedule {
  startBlock: bigint;
  interval: bigint;
  executions: bigint;
  active: boolean;
  deadline: bigint;
}

export interface TaskDefinition {
  task: Task;
  schedule: TaskSchedule;
}

export interface PolicyBond {
  bonded: bigint;
  unbonding: bigint;
  lastAccessedBlock: bigint;
}


export type QueueOptions = {
  concurrency?: number; // default 1
  autoRun?: boolean; // default true
};

export type TaskOptions = {
  id?: string;
  priority?: number; // higher = earlier
  retries?: number; // number of retries
  retryDelay?: number; // ms delay between retries
};

export type Task<T = any> = {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  canceled: boolean;
  priority: number;
  retries: number;
  retryDelay: number;
};

import type { QueueOptions, Task, TaskOptions } from "./types";

export class AsyncQueue {
  private concurrency: number;
  private autoRun: boolean;
  private queue: Task[] = [];
  private running: Set<string> = new Set();
  private runningCount = 0;
  private paused: boolean;

  constructor(options: QueueOptions = {}) {
    this.concurrency = options.concurrency ?? 1;
    this.autoRun = options.autoRun ?? true;
    this.paused = !this.autoRun;
  }

  private schedule = () => {
    if (this.paused) return;

    while (this.runningCount < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) return;

      this.runningCount++;
      this.running.add(task.id);

      const execute = async (attempt = 0): Promise<void> => {
        try {
          if (task.canceled) throw new Error("Task canceled");
          const result = await task.fn();
          task.resolve(result);
        } catch (err) {
          if (attempt < task.retries) {
            setTimeout(() => execute(attempt + 1), task.retryDelay);
            return;
          }
          task.reject(err);
        } finally {
          this.running.delete(task.id);
          this.runningCount--;
          this.schedule();
        }
      };

      execute();
    }
  };

  addTask<T>(fn: () => Promise<T>, opts: TaskOptions = {}): Promise<T> {
    const id = opts.id ?? crypto.randomUUID();

    // Remove if already queued
    const existingIndex = this.queue.findIndex((t) => t.id === id);
    if (existingIndex !== -1) {
      this.queue.splice(existingIndex, 1);
    }

    // Cancel if already running
    if (this.running.has(id)) {
      const runningTask = this.queue.find((t) => t.id === id);
      if (runningTask) runningTask.canceled = true;
      this.running.delete(id);
      this.runningCount = Math.max(0, this.runningCount - 1);
    }

    return new Promise<T>((resolve, reject) => {
      const task: Task<T> = {
        id,
        fn,
        resolve,
        reject,
        canceled: false,
        priority: opts.priority ?? 0,
        retries: opts.retries ?? 0,
        retryDelay: opts.retryDelay ?? 1000,
      };

      // Insert in correct position (priority sorted)
      const index = this.queue.findIndex((t) => t.priority < task.priority);
      if (index === -1) {
        this.queue.push(task);
      } else {
        this.queue.splice(index, 0, task);
      }

      if (this.autoRun) {
        this.schedule();
      }
    });
  }

  cancelTask(id: string) {
    const task = this.queue.find((t) => t.id === id);
    if (task) task.canceled = true;
  }

  deleteQueue() {
    this.queue = [];
  }

  cancelAllRunning() {
    this.running.forEach((id) => this.cancelTask(id));
    this.running.clear();
    this.runningCount = 0;
  }

  run() {
    this.paused = false;
    this.schedule();
  }

  pause() {
    this.paused = true;
  }

  getQueued(): string[] {
    return this.queue.map((t) => t.id);
  }

  getRunning(): string[] {
    return Array.from(this.running);
  }
}

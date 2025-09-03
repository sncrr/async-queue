import { useState, useRef, useCallback } from "react";
import type { QueueOptions, Task, TaskOptions } from "./types";

export function useAsyncQueue(options: QueueOptions = {}) {
  const { concurrency = 1, autoRun = true } = options;

  const [queued, setQueued] = useState<string[]>([]);
  const [running, setRunning] = useState<string[]>([]);
  const queueRef = useRef<Task[]>([]);
  const runningCount = useRef(0);
  const pausedRef = useRef(!autoRun);

  const schedule = useCallback(() => {
    if (pausedRef.current) return;

    while (runningCount.current < concurrency && queueRef.current.length > 0) {
      const task = queueRef.current.shift();
      if (!task) return;

      runningCount.current++;
      // move from queued → running
      setQueued((q) => q.filter((id) => id !== task.id));
      setRunning((r) => [...r, task.id]);

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
          setRunning((r) => r.filter((id) => id !== task.id));
          runningCount.current--;
          schedule(); // continue with next task
        }
      };

      execute();
    }
  }, [concurrency]);

  const addTask = useCallback(
    <T>(fn: () => Promise<T>, opts: TaskOptions = {}) => {
      const id = opts.id ?? crypto.randomUUID();

      // If exists in queue → remove it
      const existingIndex = queueRef.current.findIndex((t) => t.id === id);
      if (existingIndex !== -1) {
        queueRef.current.splice(existingIndex, 1);
      }

      // If exists in running → cancel it
      if (running.includes(id)) {
        const runningTask = queueRef.current.find((t) => t.id === id);
        if (runningTask) runningTask.canceled = true;
        setRunning((r) => r.filter((rid) => rid !== id));
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

        // Insert in correct position (priority-sorted, stable)
        const index = queueRef.current.findIndex(
          (t) => t.priority < task.priority
        );
        if (index === -1) {
          queueRef.current.push(task);
        } else {
          queueRef.current.splice(index, 0, task);
        }

        // update queued state to match
        setQueued(queueRef.current.map((t) => t.id));

        if (autoRun) {
          schedule();
        }
      });
    },
    [schedule, autoRun, running]
  );

  const cancelTask = useCallback((id: string) => {
    const task = queueRef.current.find((t) => t.id === id);
    if (task) task.canceled = true;
  }, []);

  const deleteQueue = useCallback(() => {
    queueRef.current = [];
    setQueued([]);
  }, []);

  const cancelRunning = useCallback(() => {
    // mark all running tasks as canceled
    running.forEach((id) => {
      // A running task is not in queueRef, so we can’t find it there
      // Instead we just flag them by id
      const task = queueRef.current.find((t) => t.id === id);
      if (task) task.canceled = true;
    });

    // don’t reset runningCount directly — let execute() handle it
    setRunning([]);
  }, [running]);

  const run = useCallback(() => {
    pausedRef.current = false;
    schedule();
  }, [schedule]);

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);

  return {
    addTask,
    cancelTask,
    deleteQueue,
    cancelRunning,
    run,
    pause,
    queued,
    running,
  };
}

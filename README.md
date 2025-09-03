# @sncrr/async-queue

🔹A lightweight async task queue utility with configurable concurrency, task prioritization, retries with delays, auto-run or manual execution, and cancellation (per-task or entire queue). Ideal for managing background jobs, API requests, uploads, and other async workflows.

[![npm version](https://img.shields.io/npm/v/@sncrr/async-queue.svg?style=flat-square)](https://www.npmjs.com/package/@sncrr/async-queue)
[![npm downloads](https://img.shields.io/npm/dm/@sncrr/async-queue.svg?style=flat-square)](https://www.npmjs.com/package/@sncrr/async-queue)

---

## ✨ Features

- 🔄 Runs async tasks with **configurable concurrency**
- 🎯 **Priority-based scheduling** (higher priority tasks run first)
- ♻️ **Retries with delay** (automatic retry on failure)
- ⏸️ **Auto-run** or manual execution control
- ❌ Cancel individual tasks or all running tasks
- 🧹 Delete/clear the entire queue
- ✅ Framework-agnostic (works in Node.js & browsers)
- ⚛️ Optional React hook wrapper (`useAsyncQueue`)

---

## 🚀 Install

```sh
npm install @sncrr/async-queue
# or
yarn add @sncrr/async-queue
# or
pnpm add @sncrr/async-queue
# or
bun add @sncrr/async-queue
```

---

## 📖 Usage

### AsyncQueue

```jsx
import { AsyncQueue } from "@sncrr/async-queue";

const queue = new AsyncQueue({ concurrency: 2, autoRun: true });

queue.addTask(async () => {
  await new Promise((res) => setTimeout(res, 1000));
  console.log("Task 1 done");
});

queue.addTask(
  async () => {
    await new Promise((res) => setTimeout(res, 500));
    console.log("Task 2 done");
  },
  { priority: 1 }
);
```

### With Retries and Cancellation

```jsx
const queue = new AsyncQueue({ concurrency: 1 });

const taskId = "upload-job";

queue.addTask(
  async () => {
    // Example: simulate API call
    if (Math.random() < 0.7) throw new Error("Upload failed");
    return "Success!";
  },
  { id: taskId, retries: 3, retryDelay: 2000 }
);

// Cancel the task before it finishes
queue.cancelTask(taskId);
```

### useAsyncQueue

```jsx
import { useAsyncQueue } from "@sncrr/async-queue";

export function App() {
  const {
    addTask,
    cancelTask,
    run,
    pause,
    deleteQueue,
    cancelRunning,
    queued,
    running,
  } = useAsyncQueue({
    concurrency: 1,
    autoRun: false,
  });

  const addUpload = (name: string, priority = 0) => {
    console.log("ADD", name);
    addTask(
      async () => {
        console.log("Uploading:", name);
        await new Promise((res) => setTimeout(res, 2000));
        console.log("Uploaded:", name);
      },
      { id: name, priority, retries: 2, retryDelay: 1000 }
    ).catch((err) => console.error(`${name} failed:`, err));
  };

  return (
    <div>
      <div>Queue: {queued.join(", ")}</div>
      <div>Running: {running.join(", ")}</div>
      <div>
        <button onClick={() => addUpload("file1", 1)}>
          Upload File1 (high priority)
        </button>
        <button onClick={() => addUpload("file2", 0)}>Upload File2</button>
        <button onClick={() => addUpload("file3", 2)}>
          Upload File3 (highest priority)
        </button>
      </div>
      <div>
        <button onClick={run}>Run Queue</button>
        <button onClick={pause}>Pause Queue</button>
      </div>
      <div>
        <button onClick={() => cancelTask("file1")}>Cancel File1</button>
        <button onClick={() => cancelRunning()}>Cancel All Running</button>
        <button onClick={() => deleteQueue()}>Delete Queue</button>
      </div>
    </div>
  );
}
```

---

## ⚙️ API

#### AsyncQueue(options)

- `concurrency (number, default 1)` - how many tasks can run in parallel
- `autoRun (boolean, default true)` - start running tasks automatically

#### Task Options

- `id?: string` - Task identifier (auto-generated if not provided)
- `priority?: number` - Higher numbers run first (default 0)
- `retries?: number` - Number of retries on failure (default 0)
- `retryDelay?: number` - Delay in ms before retry (default 1000)

#### Methods

- `addTask(fn, options)` - Add a task to the queue. Returns a Promise.
- `cancelTask(id)` - Cancel a specific task.
- `deleteQueue()` - Clear all queued tasks.
- `cancelAllRunning()` - Cancel all running tasks.
- `run()` - Resume execution (if paused).
- `pause()` - Pause execution.
- `getQueued()` - Get queued task IDs.
- `getRunning()` - Get running task IDs.

## 📜 License

MIT © [sncrr](https://github.com/sncrr)

/**
 * Task Queue - manages task lifecycle and execution order
 */

import { Task, TaskCreate, TaskStatus, createTask, canRun } from './task';

export type TaskHandler = (task: Task) => Promise<unknown>;

export interface QueueOptions {
  maxConcurrent?: number;
  persistPath?: string;  // Path to persist queue state
}

export class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private handlers: Map<string, TaskHandler> = new Map();
  private running: Set<string> = new Set();
  private maxConcurrent: number;
  
  constructor(options: QueueOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 4;
  }
  
  /**
   * Register a handler for a task type
   */
  registerHandler(taskName: string, handler: TaskHandler): void {
    this.handlers.set(taskName, handler);
  }
  
  /**
   * Add a task to the queue
   */
  add(input: TaskCreate): Task {
    const task = createTask(input);
    this.tasks.set(task.id, task);
    return task;
  }
  
  /**
   * Get a task by ID
   */
  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }
  
  /**
   * Get all tasks matching a filter
   */
  filter(predicate: (task: Task) => boolean): Task[] {
    return Array.from(this.tasks.values()).filter(predicate);
  }
  
  /**
   * Get completed task IDs
   */
  private getCompletedIds(): Set<string> {
    return new Set(
      this.filter(t => t.status === 'completed').map(t => t.id)
    );
  }
  
  /**
   * Get next tasks ready to run
   */
  getReady(): Task[] {
    const completed = this.getCompletedIds();
    return this.filter(t => canRun(t, completed))
      .sort((a, b) => {
        // Priority first
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        // Then by creation time
        return a.createdAt - b.createdAt;
      });
  }
  
  /**
   * Run a single task
   */
  private async runTask(task: Task): Promise<void> {
    const handler = this.handlers.get(task.name);
    if (!handler) {
      task.status = 'failed';
      task.error = `No handler registered for task: ${task.name}`;
      return;
    }
    
    task.status = 'running';
    task.startedAt = Date.now();
    this.running.add(task.id);
    
    try {
      task.result = await handler(task);
      task.status = 'completed';
      task.completedAt = Date.now();
    } catch (err) {
      task.retryCount++;
      if (task.retryCount >= task.maxRetries) {
        task.status = 'failed';
        task.error = err instanceof Error ? err.message : String(err);
      } else {
        task.status = 'pending';  // Will retry
      }
    } finally {
      this.running.delete(task.id);
    }
  }
  
  /**
   * Process the queue - run ready tasks up to concurrency limit
   */
  async tick(): Promise<number> {
    const available = this.maxConcurrent - this.running.size;
    if (available <= 0) return 0;
    
    const ready = this.getReady().slice(0, available);
    await Promise.all(ready.map(task => this.runTask(task)));
    return ready.length;
  }
  
  /**
   * Run until all tasks complete or fail
   */
  async drain(): Promise<void> {
    while (this.filter(t => t.status === 'pending' || t.status === 'running').length > 0) {
      await this.tick();
      await new Promise(r => setTimeout(r, 100));  // Small delay between ticks
    }
  }
  
  /**
   * Get queue stats
   */
  stats(): Record<TaskStatus, number> {
    const counts: Record<TaskStatus, number> = {
      pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0
    };
    for (const task of this.tasks.values()) {
      counts[task.status]++;
    }
    return counts;
  }
  
  /**
   * Export queue state (for persistence)
   */
  export(): Task[] {
    return Array.from(this.tasks.values());
  }
  
  /**
   * Import queue state (from persistence)
   */
  import(tasks: Task[]): void {
    for (const task of tasks) {
      // Reset running tasks to pending on import
      if (task.status === 'running') {
        task.status = 'pending';
      }
      this.tasks.set(task.id, task);
    }
  }
}

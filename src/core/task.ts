/**
 * Core Task definitions for AI Task Automation
 */

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Task {
  id: string;
  name: string;
  description?: string;
  
  // Execution
  status: TaskStatus;
  priority: TaskPriority;
  payload: Record<string, unknown>;
  
  // Dependencies
  dependsOn?: string[];  // Task IDs that must complete first
  
  // Timing
  createdAt: number;
  scheduledAt?: number;  // When to run (optional delay)
  startedAt?: number;
  completedAt?: number;
  
  // Results
  result?: unknown;
  error?: string;
  
  // Metadata
  retryCount: number;
  maxRetries: number;
  tags?: string[];
}

export interface TaskCreate {
  name: string;
  description?: string;
  payload: Record<string, unknown>;
  priority?: TaskPriority;
  dependsOn?: string[];
  scheduledAt?: number;
  maxRetries?: number;
  tags?: string[];
}

export function createTask(input: TaskCreate): Task {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description,
    status: 'pending',
    priority: input.priority ?? 'normal',
    payload: input.payload,
    dependsOn: input.dependsOn,
    createdAt: Date.now(),
    scheduledAt: input.scheduledAt,
    retryCount: 0,
    maxRetries: input.maxRetries ?? 3,
    tags: input.tags,
  };
}

export function canRun(task: Task, completedTaskIds: Set<string>): boolean {
  if (task.status !== 'pending') return false;
  if (task.scheduledAt && task.scheduledAt > Date.now()) return false;
  if (task.dependsOn?.some(dep => !completedTaskIds.has(dep))) return false;
  return true;
}

/**
 * Basic Queue Example
 * 
 * Demonstrates simple task queuing and execution.
 */

import { TaskQueue } from '../src';

async function main() {
  const queue = new TaskQueue({ maxConcurrent: 2 });
  
  // Register handlers
  queue.registerHandler('greet', async (task) => {
    console.log(`Hello, ${task.payload.name}!`);
    return { greeted: task.payload.name };
  });
  
  queue.registerHandler('compute', async (task) => {
    const { a, b } = task.payload as { a: number; b: number };
    await new Promise(r => setTimeout(r, 100));  // Simulate work
    return { result: a + b };
  });
  
  // Add tasks
  queue.add({ name: 'greet', payload: { name: 'World' } });
  queue.add({ name: 'compute', payload: { a: 2, b: 3 }, priority: 'high' });
  queue.add({ name: 'greet', payload: { name: 'Agents' } });
  
  // Run all tasks
  await queue.drain();
  
  // Show results
  console.log('\nStats:', queue.stats());
  console.log('\nTasks:', queue.export().map(t => ({
    name: t.name,
    status: t.status,
    result: t.result
  })));
}

main().catch(console.error);

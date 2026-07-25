export const WORKER_QUEUE_NAMES = [
  'email',
  'documents',
  'blockchain',
  'data-sync',
] as const;

export type WorkerQueueName = (typeof WORKER_QUEUE_NAMES)[number];

export const DEAD_LETTER_QUEUE_NAME = 'dead-letter';
export const DEAD_LETTER_JOB_NAME = 'failed-job';

export function isWorkerQueueName(name: string): name is WorkerQueueName {
  return (WORKER_QUEUE_NAMES as readonly string[]).includes(name);
}

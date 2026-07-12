export enum RetryStrategy {
  FIXED = 'FIXED',
  LINEAR = 'LINEAR',
  EXPONENTIAL = 'EXPONENTIAL',
  RANDOMIZED = 'RANDOMIZED',
}

export interface RetryPolicy {
  strategy: RetryStrategy;
  maxAttempts: number;
  baseDelayMs: number;
  jitterEnabled: boolean;
  maxDelayMs?: number;
}

export function calculateNextRetry(policy: RetryPolicy, currentAttempt: number): Date {
  let delay = policy.baseDelayMs;

  switch (policy.strategy) {
    case RetryStrategy.LINEAR:
      delay = policy.baseDelayMs * currentAttempt;
      break;
    case RetryStrategy.EXPONENTIAL:
      delay = policy.baseDelayMs * Math.pow(2, currentAttempt);
      break;
    case RetryStrategy.RANDOMIZED:
      delay = policy.baseDelayMs + Math.random() * policy.baseDelayMs * currentAttempt;
      break;
    case RetryStrategy.FIXED:
    default:
      delay = policy.baseDelayMs;
      break;
  }

  if (policy.jitterEnabled) {
    const jitter = 0.8 + Math.random() * 0.4;
    delay = delay * jitter;
  }

  if (policy.maxDelayMs && delay > policy.maxDelayMs) {
    delay = policy.maxDelayMs;
  }

  return new Date(Date.now() + delay);
}

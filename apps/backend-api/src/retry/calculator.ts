export interface RetryPolicy {
  type: string;
  maxAttempts: number;
  baseDelayMs: number;
  jitterEnabled: boolean;
}

export function calculateNextRun(policy: RetryPolicy, currentAttempt: number): Date {
  let delay = policy.baseDelayMs;

  switch (policy.type) {
    case 'LINEAR':
      delay = policy.baseDelayMs * currentAttempt;
      break;
    case 'EXPONENTIAL':
      delay = policy.baseDelayMs * Math.pow(2, currentAttempt);
      break;
    case 'FIXED':
    default:
      delay = policy.baseDelayMs;
      break;
  }

  if (policy.jitterEnabled) {
    // Add random jitter +/- 20%
    const jitter = 0.8 + Math.random() * 0.4;
    delay = delay * jitter;
  }

  return new Date(Date.now() + delay);
}

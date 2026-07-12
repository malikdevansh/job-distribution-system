import { calculateNextRetry, RetryPolicy, RetryStrategy } from '../src/retry';

describe('Retry Engine', () => {
  const basePolicy: RetryPolicy = {
    strategy: RetryStrategy.FIXED,
    maxAttempts: 5,
    baseDelayMs: 1000,
    jitterEnabled: false,
  };

  it('calculates FIXED retry correctly', () => {
    const nextDate = calculateNextRetry(basePolicy, 1);
    const diff = nextDate.getTime() - Date.now();
    expect(diff).toBeGreaterThanOrEqual(990);
    expect(diff).toBeLessThanOrEqual(1010);
  });

  it('calculates LINEAR retry correctly', () => {
    const linearPolicy = { ...basePolicy, strategy: RetryStrategy.LINEAR };
    const nextDate = calculateNextRetry(linearPolicy, 3);
    const diff = nextDate.getTime() - Date.now();
    expect(diff).toBeGreaterThanOrEqual(2990);
    expect(diff).toBeLessThanOrEqual(3010);
  });

  it('calculates EXPONENTIAL retry correctly', () => {
    const expPolicy = { ...basePolicy, strategy: RetryStrategy.EXPONENTIAL };
    // Math.pow(2, 3) * 1000 = 8000
    const nextDate = calculateNextRetry(expPolicy, 3);
    const diff = nextDate.getTime() - Date.now();
    expect(diff).toBeGreaterThanOrEqual(7990);
    expect(diff).toBeLessThanOrEqual(8010);
  });

  it('applies maxDelay boundary', () => {
    const expPolicy = { ...basePolicy, strategy: RetryStrategy.EXPONENTIAL, maxDelayMs: 5000 };
    // Without maxDelay it would be 8000. With maxDelay it should be 5000.
    const nextDate = calculateNextRetry(expPolicy, 3);
    const diff = nextDate.getTime() - Date.now();
    expect(diff).toBeGreaterThanOrEqual(4990);
    expect(diff).toBeLessThanOrEqual(5010);
  });
});

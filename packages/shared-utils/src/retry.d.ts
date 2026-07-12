export declare enum RetryStrategy {
    FIXED = "FIXED",
    LINEAR = "LINEAR",
    EXPONENTIAL = "EXPONENTIAL",
    RANDOMIZED = "RANDOMIZED"
}
export interface RetryPolicy {
    strategy: RetryStrategy;
    maxAttempts: number;
    baseDelayMs: number;
    jitterEnabled: boolean;
    maxDelayMs?: number;
}
export declare function calculateNextRetry(policy: RetryPolicy, currentAttempt: number): Date;
//# sourceMappingURL=retry.d.ts.map
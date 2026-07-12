"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryStrategy = void 0;
exports.calculateNextRetry = calculateNextRetry;
var RetryStrategy;
(function (RetryStrategy) {
    RetryStrategy["FIXED"] = "FIXED";
    RetryStrategy["LINEAR"] = "LINEAR";
    RetryStrategy["EXPONENTIAL"] = "EXPONENTIAL";
    RetryStrategy["RANDOMIZED"] = "RANDOMIZED";
})(RetryStrategy || (exports.RetryStrategy = RetryStrategy = {}));
function calculateNextRetry(policy, currentAttempt) {
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
//# sourceMappingURL=retry.js.map
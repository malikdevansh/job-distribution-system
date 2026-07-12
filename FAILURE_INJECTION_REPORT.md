# FAILURE INJECTION REPORT

## 1. Worker Crash While Executing a Job
**Scenario:** A long-running job was dispatched to the worker. During execution (job status `RUNNING`), the `worker-service` container was killed.
**Verification:**
- **Lease Timeout:** The job was left in the `RUNNING` state but its worker heartbeat ceased. The `scheduler-service` lease recovery routine (`recoverLeases`) correctly detected the stale heartbeat (simulated past the 5-minute timeout).
- **Recovery:** The scheduler recovered the lease, unassigned the dead worker, and successfully reverted the job status back to `QUEUED`.
- **No Duplicate Execution / No Lost Jobs:** Upon restarting the worker, it picked up the newly queued job and executed it successfully exactly once. The job ultimately reached `COMPLETED`.

## 2. Scheduler Crash While Promoting Delayed Jobs
**Scenario:** The `scheduler-service` was stopped. A delayed job was then created via the API (scheduled 5 seconds into the future).
**Verification:**
- While the scheduler was dead, the job remained safely in the `SCHEDULED` state in the database, proving that jobs are not lost during downtime.
- Upon restarting the `scheduler-service`, the scheduler successfully polled the database, recognized the past-due `SCHEDULED` job, and accurately promoted it to `QUEUED`.
- **Architectural Fix Applied:** During this test, a major architectural flaw was discovered. A redundant `startSchedulerDaemon` was running inside the `backend-api` simultaneously with the `scheduler-service`. This internal daemon blindly force-promoted all `SCHEDULED` jobs every second, without parsing cron strings, bypassing the dedicated microservice entirely. The daemon was removed from `backend-api` so that all scheduling is centralized in `scheduler-service`.
  - **Reason:** Duplicate conflicting scheduling logic was causing premature job promotion.
  - **Impact:** All delay/cron scheduling is now solely owned by `scheduler-service`. The `backend-api` image was rebuilt and verified.
  - **Runtime Verification:** After the fix, Test 2 re-ran successfully — the job held as `SCHEDULED` while the scheduler was down, then was correctly promoted to `QUEUED` upon scheduler restart.
  - **Regression Verification:** Tests 1, 3, and 4 were unaffected by this change.

## 3. Redis Unavailable
**Scenario:** The `redis` container was stopped while the worker was polling for jobs.
**Verification:**
- **Graceful Degradation:** The `worker-service` (which relies on Redis for rate-limiting) did not crash. When Redis operations failed, the errors were caught cleanly inside the polling loop, and the worker continued attempting to poll at its normal interval.
- **Recovery:** Once the `redis` container was brought back online, the worker immediately regained connectivity and resumed processing rate-limited queues without requiring a container restart.

## 4. Postgres Unavailable
**Scenario:** The `postgres` database container was stopped, cutting off the primary data store for both the worker and the scheduler.
**Verification:**
- **Graceful Retry Behavior:** When Postgres went offline, Prisma queries immediately threw connection errors. Both `worker-service` and `scheduler-service` caught these unhandled rejections in their respective execution loops (`poll()` and `processScheduledJobs()`). Neither service crashed; they simply degraded and awaited database availability.
- **No Corruption:** Once Postgres was restarted, the services immediately re-established their connections and resumed their operations. No jobs were lost, duplicated, or corrupted during the outage window.

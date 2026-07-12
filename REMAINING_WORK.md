# Remaining Work
**Date**: 2026-07-11
**Target**: Distributed Job Scheduler Monorepo

To achieve production readiness, the following work must be completed:

## 1. Infrastructure & DevOps
- Create `Dockerfile` for `backend-api`.
- Create `Dockerfile` for `worker-service`.
- Create `Dockerfile` for `scheduler-service`.
- Create `Dockerfile` for `frontend`.
- Update `docker-compose.yml` to build from these Dockerfiles and properly map volumes/ports.
- Create `.github/workflows/ci.yml` for linting, testing, and building.

## 2. Monorepo Configuration
- Fix cross-workspace dependency linking (e.g. `npm install` fails currently).
- Write valid `tsconfig.json` mappings for every package and app so that `tsc -b` compiles without errors.
- Ensure ESLint works across all workspaces.

## 3. Backend Implementation
- **API Setup**: Implement Express initialization in `backend-api/src/index.ts`.
- **Controllers/Routes**: Implement complete CRUD for Organizations, Projects, Queues, Jobs, and Workers.
- **Authentication**: Implement JWT signing and middleware.
- **Worker Daemon**: Write the polling loop in `worker-service/src/index.ts` to actually call the `claimJobs` function.
- **Scheduler Daemon**: Write the cron parser and delayed-job polling loop in `scheduler-service`.

## 4. Frontend Implementation
- Implement `react-router-dom` properly across all missing pages (Organizations, Projects, Queues, etc.).
- Add API fetching logic (e.g. `axios` or `react-query`) to connect the dashboard to the `backend-api`.
- Implement JWT authentication context on the frontend.

## 5. Testing
- Setup `jest.config.js` globally and per-workspace.
- Write unit tests for all utility functions.
- Write `supertest` integration tests for all backend endpoints.
- Ensure 90%+ code coverage is met.

## 6. Security & Observability
- Add `helmet`, `cors`, and `rate-limiter-flexible` to the backend API.
- Expose `/metrics` for Prometheus scraping in all Node.js services. 
- Implement WebSocket Server for real-time frontend updates.

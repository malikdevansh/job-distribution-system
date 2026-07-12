# Project Audit Report

## 1. Build & Run Status
- **npm install**: Completed successfully.
- **npm run lint**: Passed without errors.
- **npm test**: Passed (2 test suites, 5 tests passed). Note that tests appear to be minimal/placeholders.
- **npm run build**: **FAILED**. The frontend build fails due to missing imports (`useQueryClient`, `useMutation`) in `Organizations.tsx`, `Projects.tsx`, and `Queues.tsx`.
- **docker compose build**: **FAILED**. Docker daemon is not running or accessible on the host machine.

## 2. Identified Dead Code & Cleanup Targets
- **Legacy Frontend**: `temp-frontend/` directory is obsolete and should be deleted.
- **Duplicate/Unused Files**: A backup directory `frontend/src_backup` was found during the search and should be deleted.
- **Unused Services/Hooks**: `dispatcher.service.ts` and `useWebSockets.ts` are present but their integrations into the UI and business logic are severely lacking or mocked. (Note: We will retain them for the upcoming implementation phase, but their current state is effectively dead code).

## 3. Search Results (Mock / Placeholder / Fake Data)
A repository-wide search revealed 37 instances of mock data and placeholders. Key findings:
- `apps/backend-api/src/controllers/auth.controller.ts`: Hardcoded fallback to grab the first project for mock compatibility.
- `ENGINEERING_AUDIT.md` & `ENGINEERING_VALIDATION.md`: Acknowledge missing unit tests (placeholders) and frontend mocks.
- `frontend/src/pages/Organizations.tsx`: Uses `window.prompt` for creation instead of a modal/form. Same for `Projects.tsx` and `Queues.tsx`.
- `frontend/src/pages/Settings.tsx`: Hardcodes "Admin User" in the profile form fields.
- Various frontend pages use HTML `placeholder` attributes that double as mock data indicators (e.g., Search inputs that don't actually search).

## 4. Dependencies
- **Frontend**: React, React Router, React Query, Zustand, Axios, Tailwind CSS, Vite.
- **Backend**: Express, Prisma, PostgreSQL, Redis, ws (WebSockets).

## 5. Next Steps for Stabilization (Cleanup Phase)
1. Add missing `@tanstack/react-query` imports to `Organizations.tsx`, `Projects.tsx`, and `Queues.tsx` to fix the `npm run build` failure.
2. Delete the obsolete `temp-frontend` and `frontend/src_backup` directories.
3. Start the Docker daemon on the host machine to allow `docker compose build` and `docker compose up` to succeed.

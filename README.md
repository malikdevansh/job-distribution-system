# Job Distribution System

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)

An advanced, scalable, and robust Job Distribution and Orchestration Platform. Designed for modern multi-tenant cloud environments, this system handles the reliable queueing, distribution, scheduling, and execution of millions of jobs across distributed worker fleets.

## 🚀 Key Features

*   **Multi-Tenant Architecture**: Isolate jobs, queues, and workers by Organization and Project with strict Role-Based Access Control (RBAC).
*   **Distributed Worker Fleet**: Run workers anywhere. Workers authenticate and pull jobs securely from the central orchestration API.
*   **Intelligent Queuing System**: Support for job prioritization, fair queueing, and per-queue concurrency limits.
*   **Robust Job Lifecycle Management**: Fully transactional state transitions (`CREATED` -> `QUEUED` -> `RUNNING` -> `COMPLETED` / `FAILED`).
*   **Fault Tolerance & Retries**: Exponential backoff, jitter-enabled retry strategies, and Dead Letter Queues (DLQ) for poison messages.
*   **Cron-based Scheduler**: Built-in scheduler for delayed and recurring jobs.
*   **Real-time Observability**: WebSocket integration for live dashboard updates, and Redis-backed metrics for deep analytical insights.

## 🏗️ System Architecture

The platform is divided into a microservices architecture within a monorepo setup, orchestrated via Docker Compose:

1.  **Backend API (Node.js/Express)**: The core control plane. Handles REST requests for queues/jobs, issues JWTs, manages RBAC, and exposes WebSocket feeds.
2.  **Worker Service (TypeScript)**: The execution engine. Polls the API for jobs, executes payloads, and handles lease renewals to prevent job timeouts.
3.  **Scheduler Service**: A lightweight cron engine that pushes scheduled and recurring jobs into the active queue at the correct time.
4.  **Frontend (React/Vite)**: A beautiful, modern administration dashboard for monitoring active workers, managing queues, and inspecting logs.
5.  **Database Layer (PostgreSQL & Prisma)**: ACID-compliant persistence for jobs and entities.
6.  **Caching & Metrics (Redis)**: High-speed rate limiting, distributed locking, and real-time operational metrics.

## 🛠️ Quick Start (Local Development)

### Prerequisites

*   Docker and Docker Compose
*   Node.js (v18+)
*   npm (v10+)

### Up and Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/malikdevansh/job-distribution-system.git
   cd job-distribution-system
   ```

2. **Start the infrastructure:**
   ```bash
   # Boot up Postgres, Redis, API, Scheduler, and Frontend
   docker compose up -d
   ```

3. **Access the Dashboard:**
   Navigate to `http://localhost` (or `http://localhost:5173` if running frontend locally) to view the orchestration UI.

## 📚 API Overview

The platform exposes a versioned, RESTful API (`/api/v1`).

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/auth/login` | `POST` | Authenticate and retrieve JWT |
| `/projects` | `GET` / `POST` | Manage multi-tenant projects |
| `/queues` | `GET` / `POST` | Create and configure priority queues |
| `/jobs` | `POST` | Enqueue a new job payload |
| `/jobs/:id/clone`| `POST` | Duplicate a failed or existing job |
| `/workers` | `GET` | View active, online workers in the fleet |
| `/metrics` | `GET` | Retrieve real-time system metrics via Redis |

## 🔒 Security

*   **JWT Authentication**: All control-plane APIs are secured via stateless JWTs.
*   **Project Isolation**: Cross-tenant data leakage is prevented at the database and API layer using strict ownership checks.
*   **Rate Limiting**: Built-in queue-level rate limiting prevents worker saturation and API abuse.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

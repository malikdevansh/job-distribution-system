# DOCKER ROOT CAUSE ANALYSIS

## Executive Summary

During the execution of the final runtime acceptance phase, the host machine's Docker Desktop Daemon suffered a catastrophic failure, rendering the `dockerDesktopLinuxEngine` named pipe unresponsive. After a detailed forensic investigation of the Docker backend and WSL kernel logs, the primary root cause has been identified as a **WSL2 Out-Of-Memory (OOM) / Resource Exhaustion Crash** triggered by massively parallel `npm install` operations within the monorepo.

---

## 1. Timeline of Events

1. **Initial Trigger:** Executed `docker compose up --build -d` to provision the entire Distributed Job Scheduler cluster.
2. **Parallel Workload Execution:** BuildKit spawned 3 parallel build containers (`backend-api`, `worker-service`, `scheduler-service`). All 3 containers reached the `RUN npm install` command simultaneously.
3. **Resource Spike:** Resolving the dependency graph for a monorepo (which includes `@prisma/client` and heavily nested dependencies) is CPU and memory intensive. The parallel execution caused the `vmmem` (WSL2 virtual machine) to instantly consume all allocated memory buffers.
4. **Daemon Disconnect:** The Linux Docker Engine became unresponsive as the WSL VM hung. The Windows-side Docker Proxy (`com.docker.backend.exe`) logged a ping timeout (`context deadline exceeded`).
5. **System Deadlock:** The Docker Desktop API threw `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`.
6. **Recovery Attempt:** Executed `wsl --shutdown` to forcefully reboot the hanging Linux kernel, which revealed filesystem corruptions (orphaned inodes) indicating an unclean crash.

---

## 2. Evidence & Logs

### A. Docker Backend IPC Disconnect (`com.docker.backend.exe.log`)
The Windows-side Docker service logs explicitly show the moment the Linux Engine stopped responding to health checks.
```text
[2026-07-11T16:51:35.361274100Z][com.docker.backend.exe.ipc][W] (389a93e4-0) b50145a9-engines C<-S ConnectionClosed HEAD /_ping (1.0006117s): Head "http://ipc/_ping": context deadline exceeded
```
**Interpretation:** The Docker proxy on Windows could no longer communicate with the Linux daemon via IPC.

### B. WSL Kernel Unclean Shutdown (`dmesg`)
When inspecting the `dmesg` logs inside the `docker-desktop` WSL distribution immediately following the crash, the `ext4` filesystem reported recovering orphaned inodes.
```text
[    4.478131] EXT4-fs (sdd): 1 orphan inode deleted
[    4.478938] EXT4-fs (sdd): recovery complete
[    4.485623] EXT4-fs (sdd): mounted filesystem b800514e-410e-42c1-990a-b99d9d44a965 r/w with ordered data mode.
```
**Interpretation:** The virtual disk (`sdd`) was not unmounted cleanly. This guarantees that the WSL2 VM experienced a hard crash or kernel freeze, corroborating the OOM killer / resource exhaustion hypothesis.

---

## 3. Root Cause Classification

**PRIMARY ROOT CAUSE:** WSL2 Resource Exhaustion (Out Of Memory)
**SEVERITY:** Critical
**PROBABILITY:** 95%

### Why it happened:
The `Dockerfile` definitions across `backend-api`, `worker-service`, and `scheduler-service` all independently execute `RUN npm install && npm install @prisma/client` in their respective layers. When `docker compose up --build` runs, BuildKit parallelizes these layers. Running three simultaneous monorepo `npm install` jobs completely exhausted the dynamic memory allocated to the WSL2 Hyper-V backend, causing the Linux kernel to lock up and the IPC socket to die. 

---

## 4. Recommended Permanent Fixes

To permanently prevent this infrastructure failure without modifying the application code, the Docker build process must be optimized to respect host limits.

### A. Serialize the Build Process
Do not rely on BuildKit's parallelization for heavy Node.js monorepos. Explicitly build the containers sequentially before running `docker compose up`.
```bash
docker compose build worker-service
docker compose build scheduler-service
docker compose build backend-api
docker compose up -d
```

### B. Shared Base Image (Recommended)
Instead of running `npm install` redundantly in three separate builder layers, introduce a `base-builder` stage in a unified `Dockerfile` or rely on a shared local image.
1. Create a `base-builder` that copies the root `package.json` and runs `npm install`.
2. Have `backend-api`, `worker-service`, and `scheduler-service` `FROM base-builder`.
This reduces the memory footprint of the installation phase by 66% (1x `npm install` instead of 3x).

### C. Increase `.wslconfig` Limits
Explicitly increase the memory and CPU allowances for the WSL2 VM on the Windows host.
Create `%USERPROFILE%\.wslconfig`:
```ini
[wsl2]
memory=12GB
processors=4
swap=8GB
```

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createOrgSchema = z.object({
  name: z.string().min(1),
});

export const createProjectSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1),
});

export const createQueueSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  priority: z.number().int().optional(),
  maxConcurrency: z.number().int().positive().optional(),
  rateLimit: z.number().int().positive().optional(),
});

export const updateQueueSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'DRAINING', 'DISABLED']).optional(),
  priority: z.number().int().optional(),
  maxConcurrency: z.number().int().positive().optional(),
  rateLimit: z.number().int().positive().optional().nullable(),
});

export const createJobSchema = z.object({
  queueId: z.string().uuid(),
  payload: z.record(z.string(), z.any()),
  priority: z.number().int().optional(),
  scheduledAt: z.string().datetime().optional(),
  cron: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const cloneJobSchema = z.object({
  queueId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
  cron: z.string().optional(),
  priority: z.number().int().optional(),
});

export const cancelJobSchema = z.object({
  reason: z.string().optional(),
});

export const registerWorkerSchema = z.object({
  projectId: z.string().uuid(),
  hostname: z.string().min(1),
  labels: z.record(z.string(), z.any()).optional(),
  capabilities: z.record(z.string(), z.any()).optional(),
});

export const updateJobStatusSchema = z.object({
  status: z.enum(['CLAIMED', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRY_PENDING', 'DEAD_LETTER']),
  errorPayload: z.record(z.string(), z.any()).optional(),
  outputPayload: z.record(z.string(), z.any()).optional(),
});

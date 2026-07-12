import { Request, Response } from 'express';
import { prisma } from '@jobqueue/database';
import * as net from 'net';

type HealthCheck = { status: 'ok' | 'error'; latencyMs?: number; detail?: string };

function tcpPing(host: string, port: number, timeoutMs = 2000): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => { socket.destroy(); resolve(Date.now() - start); });
    socket.on('timeout', () => { socket.destroy(); reject(new Error('Timeout')); });
    socket.on('error', reject);
    socket.connect(port, host);
  });
}

function parseRedisHost(): { host: string; port: number } {
  const url = process.env.REDIS_URL || 'redis://redis:6379';
  // strip protocol
  const withoutProto = url.replace(/^[a-z]+:\/\//, '');
  const parts = withoutProto.split(':');
  const host = parts[0] ?? 'redis';
  const port = parseInt(parts[1] ?? '6379', 10);
  return { host, port: isNaN(port) ? 6379 : port };
}

export const getHealth = async (req: Request, res: Response) => {
  const checks: Record<string, HealthCheck> = {};

  // 1. PostgreSQL
  const pgStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = { status: 'ok', latencyMs: Date.now() - pgStart };
  } catch (e: any) {
    checks.postgres = { status: 'error', latencyMs: Date.now() - pgStart, detail: String(e.message) };
  }

  // 2. Redis — TCP ping (no redis package needed)
  const { host: redisHost, port: redisPort } = parseRedisHost();
  const redisStart = Date.now();
  try {
    const latency = await tcpPing(redisHost, redisPort);
    checks.redis = { status: 'ok', latencyMs: latency };
  } catch (e: any) {
    // omit latencyMs — exactOptionalPropertyTypes forbids assigning undefined
    checks.redis = { status: 'error', detail: String(e.message) };
  }

  // 3. Worker heartbeat
  try {
    const aliveCount = await prisma.worker.count({
      where: { lastHeartbeatAt: { gte: new Date(Date.now() - 2 * 60 * 1000) } },
    });
    checks.worker = {
      status: aliveCount > 0 ? 'ok' : 'error',
      detail: `${aliveCount} worker(s) with heartbeat in last 2 min`,
    };
  } catch (e: any) {
    checks.worker = { status: 'error', detail: String(e.message) };
  }

  // 4. Scheduler — overdue SCHEDULED jobs
  try {
    const overdueCount = await prisma.job.count({
      where: { status: 'SCHEDULED', scheduledAt: { lte: new Date(Date.now() - 2 * 60 * 1000) } },
    });
    checks.scheduler = {
      status: overdueCount === 0 ? 'ok' : 'error',
      detail: overdueCount === 0
        ? 'Scheduler promoting jobs on time'
        : `${overdueCount} overdue SCHEDULED job(s) — scheduler may be down`,
    };
  } catch (e: any) {
    checks.scheduler = { status: 'error', detail: String(e.message) };
  }

  checks.backend = { status: 'ok', detail: 'API responding' };
  checks.websocket = { status: 'ok', detail: 'WebSocket server initialized' };

  const overall = Object.values(checks).every((c) => c.status === 'ok') ? 'ok' : 'degraded';
  res.json({ status: overall, checks, timestamp: new Date().toISOString() });
};

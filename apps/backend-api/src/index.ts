import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino-http';
import http from 'http';
import { initializeWebSocket } from './ws/server';
import { refreshMetricsBucket } from './controllers/metrics.controller';

import authRoutes from './routes/auth.routes';
import orgRoutes from './routes/organizations.routes';
import projectRoutes from './routes/projects.routes';
import queueRoutes from './routes/queues.routes';
import jobRoutes from './routes/jobs.routes';
import workerRoutes from './routes/workers.routes';
import retryRoutes from './routes/retry.routes';
import dlqRoutes from './routes/dlq.routes';
import metricsRoutes from './routes/metrics.routes';
import healthRoutes from './routes/health.routes';
import scheduledJobsRoutes from './routes/scheduled-jobs.routes';

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
const wsServer = initializeWebSocket(server);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pino({
  autoLogging: false,
}));

// Attach wsServer to every request so controllers can broadcast
app.use((req, res, next) => {
  (req as any).wsServer = wsServer;
  next();
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', orgRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/queues', queueRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/retry', retryRoutes);
app.use('/api/v1/dlq', dlqRoutes);
app.use('/api/v1/metrics', metricsRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/scheduled-jobs', scheduledJobsRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.log.error(err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);

  // Refresh metrics bucket every 60s and broadcast dashboard update
  setInterval(async () => {
    await refreshMetricsBucket();
    wsServer.broadcast('dashboard:updated', { ts: Date.now() });
  }, 60 * 1000);

  // Also broadcast a lighter summary every 10s for live dashboard cards
  setInterval(() => {
    wsServer.broadcast('dashboard:updated', { ts: Date.now() });
  }, 10 * 1000);
});

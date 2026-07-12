import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import http from 'http';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-default-secret';

interface ExtWebSocket extends WebSocket {
  projectId?: string;
  isAlive: boolean;
}

export function initializeWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
      const token = url.searchParams.get('token');
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      try {
        const payload = jwt.verify(token, JWT_SECRET as string) as any;
        wss.handleUpgrade(request, socket, head, (ws) => {
          const extWs = ws as any;
          extWs.projectId = payload.projectId;  // may be undefined — that's OK
          extWs.userId = payload.id;             // always present
          extWs.role = payload.role;             // 'USER' or 'ADMIN'
          extWs.isAlive = true;
          wss.emit('connection', extWs, request);
        });
      } catch (e) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      }
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: ExtWebSocket) => {
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    ws.on('message', (message) => {
      // Handle client messages if any
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((client) => {
      const extWs = client as ExtWebSocket;
      if (extWs.isAlive === false) return extWs.terminate();

      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return {
    broadcastToProject(projectId: string, event: string, data: any) {
      wss.clients.forEach((client) => {
        const extWs = client as any;
        // Send to: clients subscribed to this project, ADMIN users, or if no projectId stored (global session)
        const isAdmin = extWs.role === 'ADMIN' || extWs.role === 'admin';
        const matchesProject = extWs.projectId === projectId;
        const isAuthenticated = extWs.userId != null;
        if (extWs.readyState === WebSocket.OPEN && (matchesProject || isAdmin || isAuthenticated)) {
          extWs.send(JSON.stringify({ event, data }));
        }
      });
    },
    broadcast(event: string, data: any) {
      wss.clients.forEach((client) => {
        const extWs = client as ExtWebSocket;
        if (extWs.readyState === WebSocket.OPEN) {
          extWs.send(JSON.stringify({ event, data }));
        }
      });
    }
  };
}

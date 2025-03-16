
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import mongoose from 'mongoose';
import { Queue } from 'bullmq';
import { z } from 'zod';
import client from 'prom-client';
import Document from '../models/Document';
import { verifyToken } from '../middleware/auth';
import presenceService from '../services/presence.service';
import logger from '../utils/logger';
import { applyOperation, transformOperations} from '../utils/ot';
import { TextOperation } from '../types/ot';
import { authorizeDocument } from '../controllers/document.controller';
const activeConnections = new client.Gauge({
  name: 'websocket_active_connections',
  help: 'Current active WebSocket connections'
});

const operationSchema = z.object({
  type: z.enum([
    'insert', 
    'delete', 
    'undo-request', 
    'redo-request', 
  ]),
  position: z.number().int().nonnegative(),
  text: z.string().optional(),
  version: z.number().int().nonnegative(),
  length: z.number().int().nonnegative().optional()
});

class WebSocketController {
  private wss: WebSocketServer;
  private operationQueue: Queue;

  constructor(httpServer: http.Server) {
    this.wss = new WebSocketServer({ server: httpServer, path: '/api/notes' });
    this.operationQueue = new Queue('operations', {
      connection: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || '6379') },
      defaultJobOptions: { removeOnComplete: true, removeOnFail: 1000 }
    });
    this.initializeEventHandlers();
  }

  private initializeEventHandlers() {
    this.wss.on('connection', async (ws: WebSocket, req) => {
      try {
        const urlParams = new URLSearchParams(req.url?.split('?')[1]);
        const token = urlParams.get('token');
        const docId = urlParams.get('docId');
        
        if (!token || !docId || !mongoose.Types.ObjectId.isValid(docId)) {
          ws.close(1008, 'Invalid parameters');
          return;
        }

        const [user, doc] = await Promise.all([
          verifyToken(token),
          Document.findById(docId).populate('createdBy collaborators')
        ]);

        if (!user || !doc || !await authorizeDocument(docId, user.id)) {
          ws.close(1008, 'Unauthorized');
          return;
        }


        if (!doc) {
          ws.close(1008, 'Document not found');
          return;
        }

        const userId = user.id.toString();
        (ws as any).user = { userId, docId };
        ws.send(JSON.stringify({ type: 'connected', docId, userId }));
        this.syncDocument(ws, doc);
        this.setupHandlers(ws, docId, userId);
        this.trackPresence(ws, docId, userId);

        logger.info(`User connected: ${userId}, Document: ${docId}`);
        activeConnections.inc();
      } catch (err) {
        logger.error(err);
        logger.error('WebSocket authentication failed', { error: err.message });
        ws.close(1008, 'Authentication failed');
      }
    });
  }

  private syncDocument(ws: WebSocket, doc: any) {
    ws.send(JSON.stringify({
      type: 'document-sync',
      content: doc.content,
      version: doc.version,
      history: doc.history.map(op => ({
        type: op.type,
        position: op.position,
        text: op.text || '',
        length: op.length || 0,  // Ensure length exists for delete operations
        version: op.version,
        user: op.user,
      }))
    }));
  }

  private setupHandlers(ws: WebSocket, docId: string, userId: string) {
    ws.on('message', async (message) => {
      try {
        const clientOp = JSON.parse(message.toString());
        if (clientOp.type === 'undo-request' || clientOp.type === 'redo-request') {
          return this.handleUndoRedo(ws, docId, userId, clientOp.type);
        }

        const validatedOp = operationSchema.parse(clientOp);
        const doc = await Document.findById(docId);

        if (!doc) return;

        let transformedOp: TextOperation = {
          type: validatedOp.type,
          position: validatedOp.position,
          text: validatedOp.text || '',
          version: validatedOp.version,
          length: validatedOp.length || 0
        };
        if (validatedOp.version !== doc.version) {
          const concurrentOps: TextOperation[] = doc.history
            .filter(op => op.version >= validatedOp.version && (op.type === 'insert' || op.type === 'delete'))
            .map(op => ({
              type: op.type as 'insert' | 'delete',
              position: op.position,
              text: op.content,
              version: op.version,
              length: validatedOp.length || 0
            }));
          transformedOp = transformOperations({
            type: validatedOp.type,
            position: validatedOp.position,
            text: validatedOp.text || '',
            version: validatedOp.version,
            length: validatedOp.length || 0
          }, concurrentOps);
        }
        const newDocState = applyOperation(doc.content, transformedOp);
        doc.content = newDocState;
        doc.version += 1;
        doc.history.push({
          ...transformedOp,
          content: doc.content,
          timestamp: new Date(),
          operations: [transformedOp],
          revertedBy: null,
          user: new mongoose.Types.ObjectId(userId)
        });
        await doc.save();

        this.broadcast(docId, JSON.stringify({ type: 'text-operation', ...transformedOp }), ws);
      } catch (err) {
        this.handleOperationError(err, ws);
      }
    });
  }

  private async handleUndoRedo(ws: WebSocket, docId: string, userId: string, action: string) {
    try {
        const doc = await Document.findById(docId);
        if (!doc) return;

        const lastOpIndex = doc.history.findLastIndex(op => op.user.equals(new mongoose.Types.ObjectId(userId)));
        if (lastOpIndex === -1) {
            ws.send(JSON.stringify({ type: 'error', message: 'NO_OPERATION_TO_UNDO' }));
            return;
        }
        const lastOp = doc.history[lastOpIndex];
        let inverseOp: TextOperation | null = null;

        if (lastOp.type === 'insert') {
          inverseOp = {
              type: 'delete',
              position: lastOp.position,
              length: lastOp.text ? [...lastOp.text].length : 0,
              version: doc.version
          };
      } else if (lastOp.type === 'delete') {
          inverseOp = {
              type: 'insert',
              position: lastOp.position,
              text: lastOp.text ? lastOp.text.slice(0, lastOp.text.length) : '',
              version: doc.version
          };
      }
      

        if (!inverseOp) {
            ws.send(JSON.stringify({ type: 'error', message: 'CANNOT_UNDO' }));
            return;
        }

        doc.content = applyOperation(doc.content, inverseOp);
        doc.version += 1;

        // Mark the operation as undone
        doc.history[lastOpIndex].revertedBy = new mongoose.Types.ObjectId(userId).toString();
        doc.history.push({
            ...inverseOp,
            content: doc.content,
            operations: [inverseOp],
            revertedBy: null,
            user: new mongoose.Types.ObjectId(userId),
            timestamp: new Date()
        });

        await doc.save();

        this.broadcast(docId, JSON.stringify({ type: 'text-operation', ...inverseOp }), ws);
    } catch (err) {
        logger.error(`Undo operation failed`, { docId, userId, error: err });
        ws.send(JSON.stringify({ type: 'error', message: 'UNDO_FAILED' }));
    }
}



  private trackPresence(ws: WebSocket, docId: string, userId: string) {
    const updatePresence = async () => {
      try {
        await presenceService.updatePresence(docId, userId);
        const collaborators = await presenceService.getActiveUsers(docId);
        ws.send(JSON.stringify({ type: 'presence-data', collaborators }));
      } catch (err) {
        logger.error('Presence update failed', { docId, userId });
      }
    };
    const heartbeat = setInterval(updatePresence, 15000);
    updatePresence();
    ws.on('close', async () => {
      clearInterval(heartbeat);
      await presenceService.removeUser(docId, userId);
      this.broadcast(docId, JSON.stringify({
        type: 'presence-update',
        userId,
        status: 'offline',
        lastSeen: Date.now()
      }), ws);
    });
  }

  private broadcast(docId: string, message: string, sender: WebSocket) {
    this.wss.clients.forEach(client => {
      if ((client as any).user?.docId === docId && client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private handleOperationError(err: unknown, ws: WebSocket) {
    console.error(err);
    if (err instanceof z.ZodError) {
      ws.send(JSON.stringify({ type: 'error', message: 'INVALID_OPERATION_FORMAT' }));
    } else {
      console.error(err);
      ws.send(JSON.stringify({ type: 'error', message: 'OPERATION_FAILED' }));
    }
  }
}

export default WebSocketController;
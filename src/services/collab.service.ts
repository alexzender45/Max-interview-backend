import { redisClient } from '../config/db';
import Document from '../models/Document';
import {
    TextOperation,
    ClientOperation,
    TransformedOperation
} from '../types/ot';
import { transformOperations } from '../utils/ot';

class CollaborationService {
    async processOperation(
        docId: string,
        clientOp: ClientOperation
    ): Promise<TransformedOperation | { newVersion: number }> {
        const doc = await Document.findById(docId);
        if (!doc) throw new Error('Document not found');

        const serverOps = doc.operations.slice(clientOp.clientVersion);

        if (serverOps.length > 0) {
            const filteredServerOps: TextOperation[] = serverOps
                .filter(op => op.type === 'insert' || op.type === 'delete')
                .map(op => ({
                    type: op.type as 'insert' | 'delete',
                    position: op.position,
                    text: op.text || '',
                    length: 0,
                    version: op.version
                }));
            const transformed = transformOperations(
                clientOp.operation,
                filteredServerOps
            );

            return {
                operation: transformed,
                serverVersion: doc.version
            };
        }

        // Apply operation directly if no conflicts
        const newContent = this.applyOperation(doc.content, clientOp.operation);

        await Document.updateOne(
            { _id: docId },
            {
                $set: { content: newContent },
                $push: { operations: clientOp.operation },
                $inc: { version: 1 }
            }
        );

        return { newVersion: doc.version + 1 };
    }

    private applyOperation(content: string, operation: TextOperation): string {
        switch (operation.type) {
            case 'insert':
                return (
                    content.slice(0, operation.position) +
                    operation.text +
                    content.slice(operation.position)
                );

            case 'delete':
                return (
                    content.slice(0, operation.position) +
                    content.slice(operation.position + operation.length)
                );

            default:
                return content;
        }
    }

    async getDocumentState(docId: string) {
        return Document.findById(docId)
            .select('content version operations')
            .lean();
    }
}

export default new CollaborationService();
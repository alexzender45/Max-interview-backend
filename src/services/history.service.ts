import mongoose from 'mongoose';
import Document from '../models/Document';

class HistoryService {
    async getDocumentHistory(docId: string) {
        return Document.findById(docId)
            .select('history')
            .lean();
    }

    async undoOperation(docId: string, userId: string) {
        const doc = await Document.findById(docId);
        if (!doc) throw new Error('Document not found');

        const lastOp = doc.operations.pop();
        if (!lastOp) return null;

        doc.history.push({
            content: doc.content,
            version: doc.version,
            operations: [lastOp],
            revertedBy: userId,
            timestamp: new Date(),
            type: lastOp.type,
            position: lastOp.position,
            user: new mongoose.Types.ObjectId(userId)
        });

        await doc.save();
        return lastOp;
    }

    async redoOperation(docId: string, userId: string) {
        const doc = await Document.findById(docId);
        if (!doc) throw new Error('Document not found');

        const lastHistory = doc.history.pop();
        if (!lastHistory) return null;

        lastHistory.operations.forEach(op => doc.operations.push(op));
        await doc.save();
        return {
            operation: lastHistory.operations,
            newVersion: doc.version
        }
    }
}

export default new HistoryService();
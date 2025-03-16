import mongoose, { Schema, model, Document } from 'mongoose';

interface IOperation {
    type: 'insert' | 'delete' | 'undo-request' | 'redo-request';
    position: number;
    text?: string;
    version: number;
}

interface IHistory {
    content: string;
    version: number;
    timestamp: Date;
    operations: IOperation[];
    revertedBy: string;
    type: 'insert' | 'delete' | 'undo-request' | 'redo-request';
    position: number;
    user: mongoose.Types.ObjectId,
    text?: string;
}

interface IDocument extends Document {
    content: string;
    version: number;
    createdBy: Schema.Types.ObjectId;
    collaborators: Schema.Types.ObjectId[];
    operations: IOperation[];
    history: IHistory[];
}

const documentSchema = new Schema<IDocument>({
    content: { type: String, required: true, default: '' },
    version: { type: Number, required: true, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    collaborators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    operations: [{
        type: { type: String, enum: 
            ['insert', 'delete', 'undo-request', 'redo-request'], 
            required: true },
        position: { type: Number, required: true, min: 0 },
        text: { type: String },
        version: { type: Number, required: true, min: 0 },
    }],

    history: [{
        content: { type: String, required: true },
        version: { type: Number, required: false, min: 0 },
        timestamp: { type: Date, default: Date.now },
        operations: [{
            type: { type: String, enum: 
                ['insert', 'delete', 'undo-request', 'redo-request'], 
                required: true },
            position: { type: Number, required: true, min: 0 },
            text: { type: String },
            version: { type: Number, required: false, min: 0 }
        }],
        revertedBy: { type: String },
        type: { type: String, enum: 
            ['insert', 'delete', 'undo-request', 'redo-request'], 
            required: true },
        position: { type: Number, required: true, min: 0 },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: false },
        text: { type: String }
    }]
});

export default model<IDocument>('Document', documentSchema);

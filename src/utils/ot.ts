import { TextOperation } from '../types/ot';
import { z } from 'zod';

export const operationSchema = z.object({
    type: z.enum([
        'insert',
        'delete',
        'undo-request',
        'redo-request',
    ]),
    position: z.number().int().nonnegative(),
    text: z.string().optional(),
    length: z.number().int().nonnegative().optional()
});


export function applyOperation(content: string, operation: TextOperation): string {
    const validatedOp = operationSchema.parse(operation);

    switch (validatedOp.type) {
        case 'insert':
            if (!validatedOp.text) throw new Error('Insert operation must include text');
            return insertText(content, validatedOp.position, validatedOp.text);

        case 'delete':
            if (!validatedOp.length) throw new Error('Delete operation must include length');
            return deleteText(content, validatedOp.position, validatedOp.length);


        default:
            throw new Error('Unsupported operation type');
    }
}

function insertText(content: string, position: number, text: string): string {
    if (position < 0 || position > content.length) {
        throw new Error('Invalid insert position');
    }
    return content.slice(0, position) + text + content.slice(position);
}

function deleteText(content: string, position: number, length: number): string {

    if (position < 0 || position >= content.length) {
        throw new Error(`Invalid delete position: ${position}`);
    }
    if (length <= 0 || position + length > content.length) {
        throw new Error(`Invalid delete length: ${length}, position: ${position}, content length: ${content.length}`);
    }

    return content.slice(0, position) + content.slice(position + length);
}


export function transformOperations(
    clientOp: TextOperation,
    serverOps: TextOperation[]
): TextOperation {
    const validatedClientOp = operationSchema.parse(clientOp) as TextOperation;
    return serverOps.reduce((transformedOp, serverOp) => {
        const validatedServerOp = operationSchema.parse(serverOp) as TextOperation;
        return transformPair(transformedOp, validatedServerOp);
    }, validatedClientOp);
}

function transformPair(clientOp: TextOperation, serverOp: TextOperation): TextOperation {
    if (clientOp.type === 'insert' && serverOp.type === 'insert') {
        if (clientOp.position <= serverOp.position) return clientOp;
        return { ...clientOp, position: clientOp.position + (serverOp.text?.length || 0) };
    }

    if (clientOp.type === 'insert' && serverOp.type === 'delete') {
        if (clientOp.position <= serverOp.position) return clientOp;
        return { ...clientOp, position: clientOp.position - serverOp.length! };
    }

    if (clientOp.type === 'delete' && serverOp.type === 'insert') {
        if (clientOp.position + clientOp.length! <= serverOp.position) return clientOp;
        return { ...clientOp, position: clientOp.position + (serverOp.text?.length || 0) };
    }

    if (clientOp.type === 'delete' && serverOp.type === 'delete') {
        if (clientOp.position >= serverOp.position + serverOp.length!) {
            return { ...clientOp, position: clientOp.position - serverOp.length! };
        }
        if (clientOp.position + clientOp.length! <= serverOp.position) return clientOp;

        // Handle overlapping delete conflicts
        const newStart = Math.min(clientOp.position, serverOp.position);
        const newEnd = Math.max(
            clientOp.position + clientOp.length!,
            serverOp.position + serverOp.length!
        );
        return { type: 'delete', position: newStart, length: newEnd - newStart, version: clientOp.version };
    }

    return clientOp;
}

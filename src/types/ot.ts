export type TextOperation = {
    type: 'insert' | 'delete' | 'undo-request' | 'redo-request';
    position: number;
    text?: string;
    version: number;
    length?: number;
  };

export interface ClientOperation {
    clientVersion: number;
    operation: TextOperation;
}

export interface TransformedOperation {
    operation: TextOperation;
    serverVersion: number;
}
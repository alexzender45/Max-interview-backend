import jwt from 'jsonwebtoken';
import { RequestHandler } from 'express';
import Document from '../models/Document';
import User from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      document?: Document;
    }
  }
}

export const authenticate: RequestHandler = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { 
            id: string; 
            email: string 
        };
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

export const authorizeDocument: RequestHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const doc = await Document.findById(req.params.id)
            .populate<{ 
                createdBy: InstanceType<typeof User>;
                collaborators: InstanceType<typeof User>[];
            }>('createdBy collaborators');

        if (!doc) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }

        const isOwner = doc.createdBy._id.toString() === req.user.id;
        const isCollaborator = doc.collaborators.some(c => 
            c._id.toString() === req.user!.id
        );

        if (!isOwner && !isCollaborator) {
            res.status(403).json({ message: 'Unauthorized access' });
            return;
        }

        req.document = doc as unknown as Document;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export function verifyToken(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string };
}
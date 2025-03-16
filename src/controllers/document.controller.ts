import Document from '../models/Document';
import User from '../models/User';

export const createDocument: (req, res) => Promise<void> = async (req, res) => {
    try {
        const doc = new Document({
            content: req.body.content,
            createdBy: req.user.id,
            operations: [],
            version: 0
        });
        await doc.save();
        res.status(201).json({ id: doc._id });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getDocument = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id)
            .populate('collaborators', 'username email');
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        res.json({
            content: doc.content,
            version: doc.version,
            collaborators: doc.collaborators
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};


    // get all documents
export const getDocuments = async (req, res) => {
        try {
            const docs = await Document.find({ createdBy: req.user.id });
            res.json(docs);
        } catch (err) {

            res.status(500).json({ message: 'Server error' });
        }
    };

    // add collaborator to document
export const addCollaborator = async (req, res) => {
        try {
            const doc = await Document.findById(req.params.id);
            if (!doc) return res.status(404).json({ message: 'Document not found' });
            if (doc.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized access' });
            const collaborator = await User.findOne({
                email: req.body.email
            })
            if (!collaborator) return res.status(404).json({ message: 'Collaborator not found' });
            if (doc.collaborators.includes(collaborator.id)) return res.status(400).json({ message: 'Collaborator already added' });
            doc.collaborators.push(collaborator.id);
            await doc.save();
            res.json({ message: 'Collaborator added' });
        } catch (err) {

            res.status(500).json({ message: 'Server error' });
        }
    };

export const authorizeDocument= async (docId:string, userId:string) => {
    try {
        const doc = await Document.findById(docId)
        if (!doc) {
            return false;
        }
        const isOwner = doc.createdBy.toString() === userId.toString();
        const isCollaborator = doc.collaborators.some((c: any) =>
            c._id.toString() === userId
        );
        if (!isOwner && !isCollaborator) {
            return false;
        }
        return true;
    }
    catch (err) {
        console.error(err);
        return false;
    }
};
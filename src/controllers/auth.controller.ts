import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export const register: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { email, password, name } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return; // Ensure to return void
        }

        // Create new user
        const user = new User({ email, password, name });
        await user.save();

        // Generate token
        const token = generateToken(user);

        res.status(201).json({ token });
        return; // Ensure to return void
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
        return; // Ensure to return void
    }
};

export const login: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return; // Ensure to return void
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials' });
            return; // Ensure to return void
        }

        // Generate token
        const token = generateToken(user);

        res.json({ token });
        return; // Ensure to return void
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
        return; // Ensure to return void
    }
};

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
    );
}

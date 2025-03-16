import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

interface IUser extends Document {
    email: string;
    password: string;
    name: string;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
    candidatePassword: string
) {
    return bcrypt.compare(candidatePassword, this.password);
};

export default model<IUser>('User', userSchema);
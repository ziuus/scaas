import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: 'principal' | 'hod' | 'faculty';
    departmentId?: mongoose.Types.ObjectId;
    facultyId?: mongoose.Types.ObjectId;
    isActive: boolean;
    comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['principal', 'hod', 'faculty'], required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const hashed = await bcrypt.hash(this.get('password') as string, 12);
    this.set('password', hashed);
});

UserSchema.methods.comparePassword = async function (password: string) {
    return bcrypt.compare(password, this.password);
};

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

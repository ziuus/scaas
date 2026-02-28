import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
    studentId: string;
    name: string;
    email: string;
    departmentId: mongoose.Types.ObjectId;
    semester: number;
    section: string;
    rollNumber: string;
}

const StudentSchema = new Schema<IStudent>({
    studentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true },
    section: { type: String, required: true },
    rollNumber: { type: String, required: true, unique: true },
}, { timestamps: true });

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);

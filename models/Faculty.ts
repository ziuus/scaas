import mongoose, { Schema, Document } from 'mongoose';

export interface IFaculty extends Document {
    facultyId: string;
    name: string;
    email: string;
    phone?: string;
    departmentId: mongoose.Types.ObjectId;
    designation: string;
    maxWeeklyLoad: number;
    currentLoad: number;
    invigilationCount: number;
    preferredDays: string[];
    preferredSlots: string[];
    isActive: boolean;
}

const FacultySchema = new Schema<IFaculty>({
    facultyId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    designation: { type: String, default: 'Assistant Professor' },
    maxWeeklyLoad: { type: Number, default: 18 },
    currentLoad: { type: Number, default: 0 },
    invigilationCount: { type: Number, default: 0 },
    preferredDays: [String],
    preferredSlots: [String],
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Faculty || mongoose.model<IFaculty>('Faculty', FacultySchema);

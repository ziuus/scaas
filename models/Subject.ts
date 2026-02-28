import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
    subjectCode: string;
    subjectName: string;
    departmentId: mongoose.Types.ObjectId;
    semester: number;
    section: string;
    subjectType: 'theory' | 'lab' | 'elective';
    hoursPerWeek: number;
}

const SubjectSchema = new Schema<ISubject>({
    subjectCode: { type: String, required: true, unique: true, uppercase: true },
    subjectName: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    section: { type: String, default: 'A' },
    subjectType: { type: String, enum: ['theory', 'lab', 'elective'], default: 'theory' },
    hoursPerWeek: { type: Number, required: true, default: 3 },
}, { timestamps: true });

export default mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);

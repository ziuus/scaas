import mongoose, { Schema, Document } from 'mongoose';

export interface IExam extends Document {
    name: string;
    departmentId: mongoose.Types.ObjectId;
    semester: number;
    examDate: Date;
    startTime: string;
    endTime: string;
    subjects: mongoose.Types.ObjectId[];
    status: 'scheduled' | 'ongoing' | 'completed';
}

const ExamSchema = new Schema<IExam>({
    name: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true },
    examDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    subjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    status: { type: String, enum: ['scheduled', 'ongoing', 'completed'], default: 'scheduled' },
}, { timestamps: true });

export default mongoose.models.Exam || mongoose.model<IExam>('Exam', ExamSchema);

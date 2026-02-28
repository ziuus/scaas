import mongoose, { Schema, Document } from 'mongoose';

export interface IReplacementAssignment extends Document {
    leaveRequestId: mongoose.Types.ObjectId;
    originalFacultyId: mongoose.Types.ObjectId;
    replacementFacultyId: mongoose.Types.ObjectId;
    subjectId: mongoose.Types.ObjectId;
    date: Date;
    startTime: string;
    endTime: string;
    roomId: mongoose.Types.ObjectId;
    status: 'suggested' | 'approved' | 'rejected';
    approvedBy?: mongoose.Types.ObjectId;
}

const ReplacementSchema = new Schema<IReplacementAssignment>({
    leaveRequestId: { type: Schema.Types.ObjectId, ref: 'LeaveRequest', required: true },
    originalFacultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    replacementFacultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    status: { type: String, enum: ['suggested', 'approved', 'rejected'], default: 'suggested' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.ReplacementAssignment || mongoose.model<IReplacementAssignment>('ReplacementAssignment', ReplacementSchema);

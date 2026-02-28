import mongoose, { Schema, Document } from 'mongoose';

export interface IInvigilatorAllocation extends Document {
    examId: mongoose.Types.ObjectId;
    roomId: mongoose.Types.ObjectId;
    departmentId: mongoose.Types.ObjectId;
    primaryInvigilatorId: mongoose.Types.ObjectId;
    backupInvigilatorId?: mongoose.Types.ObjectId;
    status: 'auto-assigned' | 'manually-assigned' | 'pending';
    assignedBy?: mongoose.Types.ObjectId;
}

const InvigilatorAllocationSchema = new Schema<IInvigilatorAllocation>({
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    primaryInvigilatorId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    backupInvigilatorId: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    status: { type: String, enum: ['auto-assigned', 'manually-assigned', 'pending'], default: 'pending' },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.InvigilatorAllocation || mongoose.model<IInvigilatorAllocation>('InvigilatorAllocation', InvigilatorAllocationSchema);

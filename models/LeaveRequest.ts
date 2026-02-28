import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveRequest extends Document {
    facultyId: mongoose.Types.ObjectId;
    departmentId: mongoose.Types.ObjectId;
    leaveType: 'full_day' | 'partial';
    startDate: Date;
    endDate: Date;
    startTime?: string;
    endTime?: string;
    reason: string;
    status: 'applied';
    substituteId?: mongoose.Types.ObjectId;  // auto-assigned substitute faculty
    affectedSlots: {
        day: string;
        startTime: string;
        endTime: string;
        subjectId: mongoose.Types.ObjectId;
        roomId: mongoose.Types.ObjectId;
        substituteId?: mongoose.Types.ObjectId;
        substituteName?: string;
    }[];
}

const LeaveRequestSchema = new Schema<ILeaveRequest>({
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    leaveType: { type: String, enum: ['full_day', 'partial'], default: 'full_day' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
    reason: { type: String, required: true },
    status: { type: String, default: 'applied' },
    substituteId: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    affectedSlots: [{
        day: String,
        startTime: String,
        endTime: String,
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
        roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
        substituteId: { type: Schema.Types.ObjectId, ref: 'Faculty' },
        substituteName: String,
    }],
}, { timestamps: true });

// Always delete the cached model so that schema changes (like removing status enum) take effect on hot reload
if (mongoose.models.LeaveRequest) {
    delete (mongoose.models as Record<string, unknown>).LeaveRequest;
}

export default mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);


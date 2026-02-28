import mongoose, { Schema, Document } from 'mongoose';

export interface ISeatingAllocation extends Document {
    examId: mongoose.Types.ObjectId;
    roomId: mongoose.Types.ObjectId;
    studentAllocations: {
        studentId: mongoose.Types.ObjectId;
        seatNumber: string;
        row: number;
        col: number;
    }[];
    capacity: number;
    allocated: number;
}

const SeatingAllocationSchema = new Schema<ISeatingAllocation>({
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    studentAllocations: [{
        studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
        seatNumber: { type: String, required: true },
        row: Number,
        col: Number,
    }],
    capacity: { type: Number, required: true },
    allocated: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.SeatingAllocation || mongoose.model<ISeatingAllocation>('SeatingAllocation', SeatingAllocationSchema);

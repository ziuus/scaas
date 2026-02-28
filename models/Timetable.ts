import mongoose, { Schema, Document } from 'mongoose';

export interface ITimetableSlot {
    day: string;
    startTime: string;
    endTime: string;
    subjectId: mongoose.Types.ObjectId;
    facultyId: mongoose.Types.ObjectId;
    roomId: mongoose.Types.ObjectId;
    section: string;
    semester: number;
}

export interface ITimetable extends Document {
    departmentId: mongoose.Types.ObjectId;
    academicYear: string;
    semester: number;
    section: string;
    slots: ITimetableSlot[];
    isApproved: boolean;
    approvedBy?: mongoose.Types.ObjectId;
    generatedAt: Date;
}

const TimetableSlotSchema = new Schema({
    day: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    section: String,
    semester: Number,
});

const TimetableSchema = new Schema<ITimetable>({
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    academicYear: { type: String, required: true },
    semester: { type: Number, required: true },
    section: { type: String, required: true },
    slots: [TimetableSlotSchema],
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Timetable || mongoose.model<ITimetable>('Timetable', TimetableSchema);

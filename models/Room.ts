import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
    roomNumber: string;
    building: string;
    capacity: number;
    departmentId?: mongoose.Types.ObjectId;
    roomType: 'classroom' | 'lab' | 'exam_hall' | 'seminar';
    isAvailable: boolean;
    facilities: string[];
}

const RoomSchema = new Schema<IRoom>({
    roomNumber: { type: String, required: true, unique: true },
    building: { type: String, default: 'Main Block' },
    capacity: { type: Number, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    roomType: { type: String, enum: ['classroom', 'lab', 'exam_hall', 'seminar'], default: 'classroom' },
    isAvailable: { type: Boolean, default: true },
    facilities: [String],
}, { timestamps: true });

export default mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);

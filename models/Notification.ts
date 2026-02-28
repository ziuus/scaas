import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    title: string;
    body: string;
    type: 'timetable_change' | 'leave_approved' | 'replacement_request' | 'exam_duty' | 'general';
    isRead: boolean;
    data?: Record<string, unknown>;
}

const NotificationSchema = new Schema<INotification>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: { type: String, enum: ['timetable_change', 'leave_approved', 'replacement_request', 'exam_duty', 'general'], default: 'general' },
    isRead: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed },
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

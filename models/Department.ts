import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
    name: string;
    code: string;
    hodId?: mongoose.Types.ObjectId;
}

const DepartmentSchema = new Schema<IDepartment>({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    hodId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.Department || mongoose.model<IDepartment>('Department', DepartmentSchema);

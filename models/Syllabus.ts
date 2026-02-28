import mongoose, { Schema, Document } from 'mongoose';

export interface ISyllabusTopic {
    topicNumber: number;
    topicName: string;
    estimatedHours: number;   // faculty hours needed to cover this topic
    unit?: string;            // optional unit/module grouping
}

export interface ISyllabus extends Document {
    departmentId: mongoose.Types.ObjectId;
    subjectId: mongoose.Types.ObjectId;
    semester: number;
    section: string;
    totalEstimatedHours: number;   // sum of all topic hours
    topics: ISyllabusTopic[];
    uploadedBy: mongoose.Types.ObjectId;  // HOD who uploaded
    academicYear: string;
    createdAt: Date;
    updatedAt: Date;
}

const SyllabusTopicSchema = new Schema<ISyllabusTopic>({
    topicNumber: { type: Number, required: true },
    topicName: { type: String, required: true },
    estimatedHours: { type: Number, required: true, min: 0.5, default: 1 },
    unit: { type: String },
}, { _id: false });

const SyllabusSchema = new Schema<ISyllabus>({
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    semester: { type: Number, required: true },
    section: { type: String, required: true },
    topics: { type: [SyllabusTopicSchema], required: true },
    totalEstimatedHours: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    academicYear: { type: String, default: '2024-25' },
}, { timestamps: true });

// Auto-compute totalEstimatedHours before save
SyllabusSchema.pre('save', function (next) {
    this.totalEstimatedHours = this.topics.reduce((sum, t) => sum + (t.estimatedHours || 1), 0);
    next();
});

// Unique syllabus per subject+semester+section
SyllabusSchema.index({ subjectId: 1, semester: 1, section: 1 }, { unique: true });

if (mongoose.models.Syllabus) {
    delete (mongoose.models as Record<string, unknown>).Syllabus;
}
export default mongoose.model<ISyllabus>('Syllabus', SyllabusSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface ISyllabusCoverage extends Document {
    facultyId: mongoose.Types.ObjectId;
    subjectId: mongoose.Types.ObjectId;
    syllabusId?: mongoose.Types.ObjectId;   // links to uploaded syllabus
    departmentId: mongoose.Types.ObjectId;
    semester: number;
    section: string;
    // Syllabus-aware fields (set when a syllabus is uploaded)
    lastTaughtTopicIndex: number;   // 0-based index into syllabus.topics array
    lastTaughtTopicName?: string;   // denormalized for display
    coveredTopics: number;          // = lastTaughtTopicIndex + 1
    totalTopics: number;
    coveredHours: number;           // sum of hours for covered topics
    remainingHours: number;         // sum of hours for remaining topics
    totalEstimatedHours: number;
    coveragePercent: number;        // (coveredHours / totalHours) * 100
    // Prediction
    predictedHoursToFinish: number; // same as remainingHours (for future ML hook)
    notes?: string;
    updatedAt: Date;
}

const SyllabusCoverageSchema = new Schema<ISyllabusCoverage>({
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    syllabusId: { type: Schema.Types.ObjectId, ref: 'Syllabus' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true },
    section: { type: String, required: true },
    lastTaughtTopicIndex: { type: Number, default: -1 },
    lastTaughtTopicName: { type: String },
    coveredTopics: { type: Number, default: 0 },
    totalTopics: { type: Number, default: 0 },
    coveredHours: { type: Number, default: 0 },
    remainingHours: { type: Number, default: 0 },
    totalEstimatedHours: { type: Number, default: 0 },
    coveragePercent: { type: Number, default: 0 },
    predictedHoursToFinish: { type: Number, default: 0 },
    notes: { type: String },
}, { timestamps: true });

SyllabusCoverageSchema.index({ departmentId: 1, semester: 1, section: 1 });
SyllabusCoverageSchema.index({ facultyId: 1, subjectId: 1, section: 1 }, { unique: true });

if (mongoose.models.SyllabusCoverage) {
    delete (mongoose.models as Record<string, unknown>).SyllabusCoverage;
}
export default mongoose.model<ISyllabusCoverage>('SyllabusCoverage', SyllabusCoverageSchema);


import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
    title: string;
    description?: string;
    date: Date;
    isCompleted: boolean;
    organization: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const TaskSchema: Schema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    isCompleted: { type: Boolean, default: false },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true }
}, {
    timestamps: true
});

// Index for efficient querying by org and date
TaskSchema.index({ organization: 1, date: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);

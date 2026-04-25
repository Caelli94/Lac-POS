import mongoose, { Schema, Document } from 'mongoose';

export interface IBackup extends Document {
    filename: string;
    label?: string;
    type: 'auto' | 'manual' | 'daily';
    organization: mongoose.Types.ObjectId;
    size: number;
    status: 'success' | 'failed';
    error?: string;
    createdAt: Date;
    itemCounts: {
        products?: number;
        customers?: number;
        suppliers?: number;
        sales?: number;
        [key: string]: number | undefined;
    };
    createdBy?: string;
    createdByRole?: string;
}

const BackupSchema: Schema = new Schema({
    filename: { type: String, required: true, unique: true },
    label: { type: String },
    type: { type: String, enum: ['auto', 'manual', 'daily'], default: 'manual' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    size: { type: Number, required: true },
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
    error: { type: String },
    createdBy: { type: String },
    createdByRole: { type: String },
    itemCounts: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

export const Backup = mongoose.model<IBackup>('Backup', BackupSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
    organization_id: mongoose.Types.ObjectId;
    name: string;
    address?: string;
    phone?: string;
    location?: string;
    manager?: string;
    opening_hours?: string;
}

const BranchSchema: Schema = new Schema({
    organization_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    location: { type: String },
    manager: { type: String },
    opening_hours: { type: String }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const Branch = mongoose.model<IBranch>('Branch', BranchSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
    organization_id: mongoose.Types.ObjectId;
    code?: string;
    name: string;
    doc_type: string;
    doc_number: string;
    phone?: string;
    email?: string;
    address?: string;
    current_account_active?: boolean;
    surcharge_rate?: number; // Positive for surcharge, negative for discount

    // Soft Delete
    deleted?: boolean;
    deletedAt?: Date;

    image_url?: string;
    last_modified_by?: mongoose.Types.ObjectId;
}

const CustomerSchema: Schema = new Schema({
    organization_id: { type: Schema.Types.ObjectId, required: true, index: true },
    code: { type: String },
    name: { type: String, required: true },
    doc_type: { type: String, default: 'DNI' },
    doc_number: { type: String, default: '' },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    city: { type: String },
    province: { type: String },
    current_account_active: { type: Boolean, default: false },
    surcharge_rate: { type: Number, default: 0 },

    // Soft Delete
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },

    image_url: { type: String },
    last_modified_by: { type: Schema.Types.ObjectId, ref: 'User' }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for Search & Filter Optimization
CustomerSchema.index({ organization_id: 1, name: 1 }); // Alpha sort / Search by Name
CustomerSchema.index({ organization_id: 1, code: 1 }); // Search by Code
CustomerSchema.index({ organization_id: 1, doc_number: 1 }); // Search by Doc Number
CustomerSchema.index({ organization_id: 1, deleted: 1 }); // Soft Delete Check

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);

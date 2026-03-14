import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
    code?: string;
    name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    tax_id?: string; // RUC/CUIT
    organization_id: mongoose.Types.ObjectId | string;
    supabase_id?: string;
    // New Fields
    instagram?: string;
    tiktok?: string;
    web_url?: string;
    addresses?: {
        street: string;
        gallery?: string;
        city?: string;
        province?: string;
        postal_code?: string;
        notes?: string;
    }[];
    emails?: {
        email: string;
        contact_name?: string;
        notes?: string;
    }[];
    phones?: {
        number: string;
        notes?: string;
    }[];
    category_ids?: (mongoose.Types.ObjectId | string)[];

    // Soft Delete
    // Soft Delete
    deleted?: boolean;
    deletedAt?: Date;

    image_url?: string;
    import_config?: Record<string, string>;
    last_modified_by?: mongoose.Types.ObjectId;
}

const SupplierSchema: Schema = new Schema({
    code: { type: String },
    name: { type: String, required: true },
    contact_name: { type: String },
    email: { type: String },
    phone: { type: String }, // Keeping for backward compatibility or primary
    tax_id: { type: String },
    organization_id: { type: Schema.Types.Mixed, required: true },
    supabase_id: { type: String, unique: true, sparse: true },
    category_ids: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    // New Fields
    instagram: { type: String },
    tiktok: { type: String },
    web_url: { type: String },
    addresses: [{
        street: { type: String },
        gallery: { type: String },
        city: { type: String },
        province: { type: String },
        postal_code: { type: String },
        notes: { type: String }
    }],
    emails: [{
        email: { type: String },
        contact_name: { type: String },
        notes: { type: String }
    }],
    phones: [{
        number: { type: String },
        notes: { type: String }
    }],

    // Soft Delete
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },

    image_url: { type: String },
    import_config: { type: Schema.Types.Mixed, default: {} },
    last_modified_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indices for Search & Sort
SupplierSchema.index({ organization_id: 1, name: 1 });
SupplierSchema.index({ organization_id: 1, code: 1 });
SupplierSchema.index({ organization_id: 1, tax_id: 1 });
SupplierSchema.index({ organization_id: 1, deleted: 1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);

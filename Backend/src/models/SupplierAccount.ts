import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplierAccount extends Document {
    organization_id: mongoose.Types.ObjectId;
    supplier_id: mongoose.Types.ObjectId;
    balance: number; // Positive = We owe the supplier. Negative = Supplier owes us (Advance).
    credit_limit: number; // New field
    is_active: boolean;
    last_debt_date?: Date;
    updated_at: Date;
}

const SupplierAccountSchema: Schema = new Schema({
    organization_id: { type: Schema.Types.Mixed, required: true, index: true },
    supplier_id: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, unique: true },
    balance: { type: Number, default: 0 },
    credit_limit: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    last_debt_date: { type: Date }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indices for Account
SupplierAccountSchema.index({ organization_id: 1, balance: 1 }); // Debt Filtering

export const SupplierAccount = mongoose.model<ISupplierAccount>('SupplierAccount', SupplierAccountSchema);

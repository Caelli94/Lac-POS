import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomerAccount extends Document {
    organization_id: mongoose.Types.ObjectId;
    customer_id: mongoose.Types.ObjectId;
    balance: number;
    credit_limit: number;
    is_active: boolean;
    last_debt_date?: Date;
    updated_at: Date;
}

const CustomerAccountSchema: Schema = new Schema({
    organization_id: { type: Schema.Types.Mixed, required: true, index: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, unique: true },
    balance: { type: Number, default: 0 },
    credit_limit: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    last_debt_date: { type: Date }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for Account Lookup & Debt Filtering
CustomerAccountSchema.index({ organization_id: 1, balance: 1 }); // Filter Debtors / Non-Debtors

export const CustomerAccount = mongoose.model<ICustomerAccount>('CustomerAccount', CustomerAccountSchema);

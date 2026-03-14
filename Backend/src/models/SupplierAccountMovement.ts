import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplierAccountMovement extends Document {
    account_id: mongoose.Types.ObjectId;
    type: 'DEBIT' | 'CREDIT'; // DEBIT = Increase Debt (Invoice). CREDIT = Decrease Debt (Payment).
    amount: number;
    description: string;
    status: 'valid' | 'cancelled';
    created_at: Date;
    performed_by?: mongoose.Types.ObjectId | string;
}

const SupplierAccountMovementSchema: Schema = new Schema({
    account_id: { type: Schema.Types.ObjectId, ref: 'SupplierAccount', required: true, index: true },
    type: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    performed_by: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: ['valid', 'cancelled'], default: 'valid' }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

export const SupplierAccountMovement = mongoose.model<ISupplierAccountMovement>('SupplierAccountMovement', SupplierAccountMovementSchema);

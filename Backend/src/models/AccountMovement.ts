import mongoose, { Schema, Document } from 'mongoose';

export interface IAccountMovement extends Document {
    account_id: mongoose.Types.ObjectId;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    description: string;
    created_at: Date;
    performed_by?: mongoose.Types.ObjectId | string;
    status: 'valid' | 'cancelled';
}

const AccountMovementSchema: Schema = new Schema({
    account_id: { type: Schema.Types.ObjectId, ref: 'CustomerAccount', required: true, index: true },
    type: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    performed_by: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: ['valid', 'cancelled'], default: 'valid' }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

export const AccountMovement = mongoose.model<IAccountMovement>('AccountMovement', AccountMovementSchema);

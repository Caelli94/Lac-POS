import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchase extends Document {
    organization_id: mongoose.Types.ObjectId;
    supplier_id: mongoose.Types.ObjectId | null;
    total_amount: number;
    date: Date;
    performed_by?: mongoose.Types.ObjectId | string;
    created_at: Date;
}

const PurchaseSchema: Schema = new Schema({
    organization_id: { type: Schema.Types.Mixed, required: true, index: true },
    supplier_id: { type: Schema.Types.Mixed, default: null },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    total_amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    performed_by: { type: Schema.Types.ObjectId, ref: 'User', index: true },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const Purchase = mongoose.model<IPurchase>('Purchase', PurchaseSchema);

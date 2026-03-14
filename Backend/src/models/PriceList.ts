import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceList extends Document {
    organization_id: mongoose.Types.ObjectId;
    name: string;
    is_active: boolean;
}

const PriceListSchema: Schema = new Schema({
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    is_active: { type: Boolean, default: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const PriceList = mongoose.model<IPriceList>('PriceList', PriceListSchema);

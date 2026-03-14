import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document {
    organization_id: mongoose.Types.ObjectId;
    entity_type: string; // 'customer', 'supplier', 'product'
    seq: number;
}

const CounterSchema: Schema = new Schema({
    organization_id: { type: Schema.Types.Mixed, required: true },
    entity_type: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

// Compound index to ensure uniqueness per org and type
CounterSchema.index({ organization_id: 1, entity_type: 1 }, { unique: true });

export const Counter = mongoose.model<ICounter>('Counter', CounterSchema);

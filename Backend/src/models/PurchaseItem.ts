import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseItem extends Document {
    purchase_id: mongoose.Types.ObjectId;
    product_id: mongoose.Types.ObjectId;
    variant_id?: string; // ID de la variante (ej: Talle M, Color Negro)
    quantity: number;
    cost: number;
}

const PurchaseItemSchema: Schema = new Schema({
    purchase_id: { type: Schema.Types.ObjectId, ref: 'Purchase', required: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant_id: { type: String }, // Opcional, solo si el producto tiene variantes
    quantity: { type: Number, required: true },
    cost: { type: Number, required: true }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const PurchaseItem = mongoose.model<IPurchaseItem>('PurchaseItem', PurchaseItemSchema);

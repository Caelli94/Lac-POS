import mongoose, { Schema, Document } from 'mongoose';

export interface IStockLot extends Document {
    organization_id: mongoose.Types.ObjectId;
    product_id: mongoose.Types.ObjectId;
    variant_id?: string;
    branch_id: mongoose.Types.ObjectId;
    lot_number: string;
    expiration_date: Date;
    stock: number;
    initial_stock: number;
}

const StockLotSchema: Schema = new Schema({
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variant_id: { type: String },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    lot_number: { type: String, required: true },
    expiration_date: { type: Date, required: true },
    stock: { type: Number, required: true, default: 0 },
    initial_stock: { type: Number, required: true },
}, {
    timestamps: true
});

// Índices para búsquedas rápidas de vencimiento
StockLotSchema.index({ organization_id: 1, expiration_date: 1 });
StockLotSchema.index({ organization_id: 1, product_id: 1, lot_number: 1 });

export const StockLot = mongoose.model<IStockLot>('StockLot', StockLotSchema);

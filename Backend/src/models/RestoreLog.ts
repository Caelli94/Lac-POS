import mongoose, { Schema, Document } from 'mongoose';

export interface IRestoreItem {
    name: string;
    identifier: string; // SKU, DNI, Email, etc.
    type: 'Product' | 'Customer' | 'Supplier';
    item_status: 'RESTORED' | 'PROCESSED' | 'NEW';
}

export interface IRestoreLog extends Document {
    timestamp: Date;
    organization?: any;
    backup_filename: string;
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'RESTORED' | 'PROCESSED';
    summary: {
        products: number;
        customers: number;
        suppliers: number;
        sales: number;
        others: number;
    };
    details: {
        products: IRestoreItem[];
        customers: IRestoreItem[];
        suppliers: IRestoreItem[];
    };
}

const RestoreItemSchema = new Schema({
    name: { type: String, required: true },
    identifier: { type: String, required: true },
    type: { type: String, required: true },
    item_status: { type: String, enum: ['RESTORED', 'PROCESSED', 'NEW'], default: 'PROCESSED' }
}, { _id: false });

const RestoreLogSchema = new Schema<IRestoreLog>({
    timestamp: { type: Date, default: Date.now },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    backup_filename: { type: String, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'PARTIAL', 'RESTORED', 'PROCESSED'], default: 'SUCCESS' },
    summary: {
        products: { type: Number, default: 0 },
        customers: { type: Number, default: 0 },
        suppliers: { type: Number, default: 0 },
        sales: { type: Number, default: 0 },
        others: { type: Number, default: 0 }
    },
    details: {
        products: [RestoreItemSchema],
        customers: [RestoreItemSchema],
        suppliers: [RestoreItemSchema]
    }
}, {
    timestamps: true
});

export const RestoreLog = mongoose.model<IRestoreLog>('RestoreLog', RestoreLogSchema);

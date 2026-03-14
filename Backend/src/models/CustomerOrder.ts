import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomerOrder extends Document {
    organization_id: mongoose.Types.ObjectId | string;
    customer_id?: mongoose.Types.ObjectId | string;
    customer_name?: string;
    payment_method?: string;
    cash_movement_id?: mongoose.Types.ObjectId | string;
    product_name: string; // The text description of what they want
    product_id?: mongoose.Types.ObjectId | string; // Optionally link to catalog
    quantity: number;
    details?: string;
    status: 'PENDING' | 'ORDERED' | 'ARRIVED' | 'DELIVERED' | 'CANCELLED';
    deposit_amount: number; // Seña
    expected_date?: Date;

    // Audit
    performed_by?: mongoose.Types.ObjectId | string;
    deleted?: boolean;
    deletedAt?: Date;
}

const CustomerOrderSchema: Schema = new Schema({
    organization_id: { type: Schema.Types.Mixed, required: true, index: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer' }, // Can be null if anonymous? Usually better to force customer.
    customer_name: { type: String, required: false }, // For ad-hoc customers or to preserve name if customer is deleted
    payment_method: { type: String, required: false }, // Cash, Transfer, etc.
    cash_movement_id: { type: Schema.Types.ObjectId, ref: 'CashMovement', required: false },
    product_name: { type: String, required: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 },
    details: { type: String },
    status: {
        type: String,
        enum: ['PENDING', 'ORDERED', 'ARRIVED', 'DELIVERED', 'CANCELLED'],
        default: 'PENDING'
    },
    deposit_amount: { type: Number, default: 0 },
    expected_date: { type: Date },

    performed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populates
CustomerOrderSchema.virtual('customer', {
    ref: 'Customer',
    localField: 'customer_id',
    foreignField: '_id',
    justOne: true
});

CustomerOrderSchema.virtual('product', {
    ref: 'Product',
    localField: 'product_id',
    foreignField: '_id',
    justOne: true
});

export const CustomerOrder = mongoose.model<ICustomerOrder>('CustomerOrder', CustomerOrderSchema);

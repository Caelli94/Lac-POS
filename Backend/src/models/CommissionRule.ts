import mongoose, { Schema, Document } from 'mongoose';

export interface ICommissionRule extends Document {
    organization_id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    active: boolean;
    priority: number; // Lower number = higher priority
    
    // Conditions
    conditions: {
        roles?: mongoose.Types.ObjectId[]; // Array of Role IDs
        categories?: mongoose.Types.ObjectId[]; // Array of Category IDs
        payment_methods?: string[]; // Array of payment methods (e.g. 'cash', 'credit_card')
        price_lists?: string[]; // Array of price list IDs or names
    };
    
    // Action
    action: {
        type: 'percentage' | 'fixed_amount';
        base: 'gross' | 'net'; // Gross = Percentage of Price, Net = Percentage of Profit (Price - Cost)
        value: number; // e.g. 10 (for 10%), or 500 (for $500)
    };

    // Scales (Metas/Incentivos)
    // If set, this rule can scale up based on monthly sales performance
    scales?: {
        threshold: number; // Monthly sales goal (e.g. 1,000,000)
        value: number; // New commission value (e.g. 15 for 15%)
    }[];
    
    createdAt: Date;
    updatedAt: Date;
}

const CommissionRuleSchema: Schema = new Schema({
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    active: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 0, index: true },
    
    conditions: {
        roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
        categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
        payment_methods: [{ type: String }],
        price_lists: [{ type: String }]
    },
    
    action: {
        type: { type: String, enum: ['percentage', 'fixed_amount'], required: true },
        base: { type: String, enum: ['gross', 'net'], required: true },
        value: { type: Number, required: true }
    },

    scales: [{
        threshold: { type: Number, required: true },
        value: { type: Number, required: true }
    }]
}, {
    timestamps: true
});

export const CommissionRule = mongoose.model<ICommissionRule>('CommissionRule', CommissionRuleSchema);

import mongoose, { Schema, Document } from 'mongoose';

// --- SALE ITEM ---
export interface ISaleItem extends Document {
    sale_id: mongoose.Types.ObjectId | string;
    product_id: mongoose.Types.ObjectId | string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    discount?: { type: 'PERCENT' | 'FIXED', value: number, applied_amount: number };
    tax_rate?: number;
    exclude_from_general_discount?: boolean;
    variant_id?: string;
    variant_name?: string;
    supabase_id?: string;
}

const SaleItemSchema: Schema = new Schema({
    sale_id: { type: Schema.Types.Mixed, required: true, index: true },
    product_id: { type: Schema.Types.Mixed, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    total_price: { type: Number, required: true },
    discount: {
        type: { type: String, enum: ['PERCENT', 'FIXED'] },
        value: { type: Number },
        applied_amount: { type: Number }
    },
    tax_rate: { type: Number, default: 21.0 }, // Snapshot of VAT at time of sale
    exclude_from_general_discount: { type: Boolean, default: false },
    variant_id: { type: String },
    variant_name: { type: String },
    supabase_id: { type: String, unique: true, sparse: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const SaleItem = mongoose.model<ISaleItem>('SaleItem', SaleItemSchema);


// --- SALE ---
export interface ISale extends Document {
    organization_id: mongoose.Types.ObjectId;
    customer_id?: mongoose.Types.ObjectId | string;
    session_id?: mongoose.Types.ObjectId | string; // Relación con CashSession
    total_amount: number;
    // payment_method: DEPRECATED in favor of payments array, but kept optional for backward compat if needed? No, let's switch.
    payments: { method: 'cash' | 'credit_card' | 'debit_card' | 'transfer' | 'check' | 'ACCOUNT', amount: number }[];
    discount_general?: { type: 'PERCENT' | 'FIXED', value: number, applied_amount: number };
    surcharge_general?: { type: 'PERCENT' | 'FIXED', value: number, applied_amount: number };
    rounding_difference?: number;
    manual_tax_added?: boolean;
    document_type: 'ticket' | 'invoice' | 'quote' | 'delivery_note' | 'credit_note';
    performed_by?: mongoose.Types.ObjectId | string;
    invoice_letter?: 'A' | 'B' | 'C' | 'M' | 'X';
    fiscal_data?: {
        cuit?: string;
        legal_name?: string;
        address?: string;
        vat_condition?: string;
        tax_breakdown?: {
            rate: number;
            base_amount: number;
            tax_amount: number;
        }[];
    };
    status: 'completed' | 'pending' | 'cancelled';
    date: Date;
    afip_data?: {
        cae: string;
        cae_expiration: Date;
        fiscal_error?: string;
        cbte_tipo?: number;
        pto_vta?: number;
        cbte_nro?: number;
    };
    commission_amount?: number;
    supabase_id?: string;

    // Integraciones Externas
    external_reference?: string;
    source?: 'local' | 'tiendanube' | 'wix';
    payment_details?: any;
}

const SaleSchema: Schema = new Schema({
    organization_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    session_id: { type: Schema.Types.Mixed }, // ref: 'CashSession' si existe
    total_amount: { type: Number, required: true },
    payments: [{
        method: { type: String, enum: ['cash', 'credit_card', 'debit_card', 'transfer', 'check', 'ACCOUNT'], required: true },
        amount: { type: Number, required: true }
    }],
    discount_general: {
        type: { type: String, enum: ['PERCENT', 'FIXED'] },
        value: { type: Number },
        applied_amount: { type: Number }
    },
    surcharge_general: {
        type: { type: String, enum: ['PERCENT', 'FIXED'] },
        value: { type: Number },
        applied_amount: { type: Number }
    },
    rounding_difference: { type: Number, default: 0 },
    manual_tax_added: { type: Boolean, default: false },
    document_type: { type: String, enum: ['ticket', 'invoice', 'quote', 'delivery_note', 'credit_note'], default: 'ticket' },
    performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    invoice_letter: { type: String, enum: ['A', 'B', 'C', 'M', 'X'] },
    fiscal_data: {
        cuit: String,
        legal_name: String,
        address: String,
        vat_condition: String,
        tax_breakdown: [{
            rate: Number,
            base_amount: Number,
            tax_amount: Number
        }]
    },
    status: { type: String, enum: ['completed', 'pending', 'cancelled'], default: 'completed' },
    date: { type: Date, default: Date.now },
    afip_data: {
        cae: { type: String },
        cae_expiration: { type: Date },
        fiscal_error: { type: String },
        cbte_tipo: { type: Number },
        pto_vta: { type: Number },
        cbte_nro: { type: Number }
    },
    commission_amount: { type: Number, default: 0 },
    supabase_id: { type: String, unique: true, sparse: true },

    // Integraciones Externas
    external_reference: { type: String, index: true },
    source: { type: String, enum: ['local', 'tiendanube', 'wix'], default: 'local', index: true },
    payment_details: { type: Schema.Types.Mixed }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index for common queries: Filter by Org + Sort by Date
SaleSchema.index({ organization_id: 1, date: -1 });

export const Sale = mongoose.model<ISale>('Sale', SaleSchema);

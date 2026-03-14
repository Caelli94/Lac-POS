import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    description?: string;
    price: number;
    cost?: number;
    stock: number;
    min_stock?: number;
    tax_rate?: number;
    barcode?: string;
    sku?: string;
    image_url?: string;
    is_visible?: boolean;
    manages_lots?: boolean;

    category_ids?: mongoose.Types.ObjectId[];
    supplier_id?: mongoose.Types.ObjectId;
    supplier_product_code?: string;
    organization_id: mongoose.Types.ObjectId;

    branch_stocks?: Map<string, number>; // New: Stock por sucursal para producto base
    custom_attributes?: Map<string, string>;

    variants?: {
        tempId?: string;
        color: string;
        color_hex?: string;
        size: string;
        stock: number;
        barcode?: string;
        image_url?: string;
        branch_stocks?: Map<string, number>;
        custom_attributes?: Map<string, string>;
    }[];

    pricing?: {
        list_id: mongoose.Types.ObjectId;
        name?: string;
        price: number;
        cost?: number;
        utilityValue?: number;
        utilityType?: string;
    }[];

    supabase_id?: string;

    // Soft Delete
    deleted?: boolean;
    deletedAt?: Date;

    last_modified_by?: mongoose.Types.ObjectId;

    // Integraciones Externas
    external_ids?: Map<string, string>; // e.g., { 'tiendanube': '123', 'wix': 'abc' }
    sync_locked?: boolean;
}

const ProductSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    cost: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    min_stock: { type: Number, default: 0 },
    tax_rate: { type: Number, default: 21.0 }, // IVA: 21, 10.5, 27, 2.5, 0
    barcode: { type: String },
    sku: { type: String },
    image_url: { type: String },

    // Relaciones
    category_ids: [{ type: Schema.Types.ObjectId, ref: 'Category' }], // Array de categorías
    supplier_id: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    supplier_product_code: { type: String }, // Código del producto en el proveedor
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },

    // Nuevos campos complejos
    // Nuevos campos complejos
    branch_stocks: { type: Map, of: Number }, // Global Branch Stocks (para producto simple)
    custom_attributes: { type: Map, of: String },

    variants: [{
        tempId: String, // Matching ID from client
        color: String,
        color_hex: String,
        size: String,
        stock: Number,
        barcode: { type: String, trim: true },
        image_url: String,
        branch_stocks: { type: Map, of: Number }, // Map de branch_id -> cantidad (para variante)
        custom_attributes: { type: Map, of: String }
    }],

    pricing: [{
        list_id: { type: Schema.Types.ObjectId, ref: 'PriceList' },
        name: String, // Cache del nombre para facilitar
        price: Number,
        cost: Number,
        utilityValue: Number,
        utilityType: String
    }],

    is_visible: { type: Boolean, default: true },
    manages_lots: { type: Boolean, default: false },

    supabase_id: { type: String, unique: true, sparse: true },

    // Auditoría
    last_modified_by: { type: Schema.Types.ObjectId, ref: 'User' },

    // Soft Delete
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },

    // Integraciones Externas
    external_ids: { type: Map, of: String },
    sync_locked: { type: Boolean, default: false }
}, {
    timestamps: true,
    toObject: { virtuals: true }
});

// Compound Indices for Search & Filter Performance
ProductSchema.index({ organization_id: 1, name: 1 }); // Alpha sort / Search
ProductSchema.index({ organization_id: 1, sku: 1 }); // SKU Search
ProductSchema.index({ organization_id: 1, supplier_id: 1 }); // Filter by Supplier
ProductSchema.index({ organization_id: 1, category_ids: 1 }); // Filter by Category
ProductSchema.index({ organization_id: 1, is_visible: 1 }); // Filter by Visibility
ProductSchema.index({ organization_id: 1, deleted: 1 }); // Soft Delete check

export const Product = mongoose.model<IProduct>('Product', ProductSchema);

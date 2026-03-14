import mongoose, { Document, Schema } from 'mongoose';

// --- Cash Register ---
export interface ICashRegister extends Document {
    organization: mongoose.Types.ObjectId;
    name: string;
    status: 'open' | 'closed';
    openingBalance: number;
    closingBalance?: number;
    openedAt: Date;
    closedAt?: Date;
    openedBy: mongoose.Types.ObjectId; // User ID
    branch_id?: mongoose.Types.ObjectId; // Link to Branch
}

const CashRegisterSchema: Schema = new Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, default: 'Caja Principal' },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }, // Optional field
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    openingBalance: { type: Number, required: true },
    closingBalance: { type: Number },
    closedAt: { type: Date },
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const CashRegister = mongoose.model<ICashRegister>('CashRegister', CashRegisterSchema);

// --- Cash Session ---
export interface ICashSession extends Document {
    organization: mongoose.Types.ObjectId;
    cashRegister: mongoose.Types.ObjectId;
    openedBy: mongoose.Types.ObjectId;
    closedBy?: mongoose.Types.ObjectId;
    openingBalance: number;
    closingBalance?: number;
    expectedBalance?: number;
    status: 'open' | 'closed';
    openedAt: Date;
    closedAt?: Date;
    notes?: string;
    cashierName?: string;
    shiftName?: string;
}

const CashSessionSchema: Schema = new Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    cashRegister: { type: mongoose.Schema.Types.ObjectId, ref: 'CashRegister', required: true },
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    openingBalance: { type: Number, required: true },
    closingBalance: { type: Number },
    expectedBalance: { type: Number },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    notes: { type: String },
    cashierName: { type: String },
    shiftName: { type: String }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const CashSession = mongoose.model<ICashSession>('CashSession', CashSessionSchema);

// --- Cash Movement ---
export interface ICashMovement extends Document {
    cashRegister: mongoose.Types.ObjectId;
    session: mongoose.Types.ObjectId; // Link to session
    type: 'SALE' | 'EXPENSE' | 'PAYMENT_RECEIVED' | 'WITHDRAWAL' | 'IN' | 'OUT';
    amount: number;
    description: string;
    paymentMethod: string;
    referenceId?: string;
    date: Date;
    status: 'valid' | 'cancelled'; // Added status field
    customer?: mongoose.Types.ObjectId;
    supplier?: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
}

const CashMovementSchema: Schema = new Schema({
    cashRegister: { type: mongoose.Schema.Types.ObjectId, ref: 'CashRegister', required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'CashSession' }, // Optional for migration, but should be required
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    paymentMethod: { type: String },
    referenceId: { type: String },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['valid', 'cancelled'], default: 'valid' }, // Added status field
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const CashMovement = mongoose.model<ICashMovement>('CashMovement', CashMovementSchema);

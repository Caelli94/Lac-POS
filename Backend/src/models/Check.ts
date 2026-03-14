import mongoose, { Document, Schema } from 'mongoose';

export interface ICheck extends Document {
    organization: mongoose.Types.ObjectId;
    type: 'own' | 'third_party';
    number: string;
    bank: string;
    amount: number;
    issue_date: Date;
    due_date: Date;
    cuit?: string;
    entity: string; // Destinatario (Propio) o Emisor (Tercero)
    motive?: string;
    status: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CheckSchema: Schema = new Schema({
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    type: { type: String, enum: ['own', 'third_party'], required: true },
    number: { type: String, required: true },
    bank: { type: String, required: true },
    amount: { type: Number, required: true },
    issue_date: { type: Date, required: true },
    due_date: { type: Date, required: true },
    cuit: { type: String },
    entity: { type: String, required: true },
    motive: { type: String },
    status: { type: String, required: true },
    notes: { type: String }
}, {
    timestamps: true
});

// Índices para facilitar búsquedas
CheckSchema.index({ organization: 1, type: 1 });
CheckSchema.index({ organization: 1, number: 1 });
CheckSchema.index({ organization: 1, cuit: 1 });
CheckSchema.index({ organization: 1, entity: 'text', motive: 'text' });

export const Check = mongoose.model<ICheck>('Check', CheckSchema);

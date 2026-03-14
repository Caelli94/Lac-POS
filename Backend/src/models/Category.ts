import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    organization_id: mongoose.Types.ObjectId | string; // Permitir string si mapeamos UUIDs o ObjectId si re-linkeamos
    supabase_id?: string; // Para guardar el ID original y facilitar relaciones
}

const CategorySchema: Schema = new Schema({
    name: { type: String, required: true },
    organization_id: { type: Schema.Types.Mixed, required: true, index: true },
    supabase_id: { type: String, unique: true, sparse: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const Category = mongoose.model<ICategory>('Category', CategorySchema);

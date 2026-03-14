import mongoose, { Document, Schema } from 'mongoose';

export interface IPermission {
    module: string;
    view: boolean;
    edit: boolean;
    delete: boolean;
    tabs?: {
        name: string;
        enabled: boolean;
    }[];
}

export interface IRole extends Document {
    name: string;
    organization: mongoose.Types.ObjectId;
    permissions: IPermission[];
    isSystem?: boolean;
    allowSuperAdmin?: boolean; // Can manage/delegate audits
    createdAt: Date;
    updatedAt: Date;
}

const RoleSchema: Schema = new Schema({
    name: { type: String, required: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    permissions: [{
        module: { type: String, required: true },
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        tabs: [{
            name: { type: String },
            enabled: { type: Boolean, default: false }
        }]
    }],
    isSystem: { type: Boolean, default: false },
    allowSuperAdmin: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Índice para asegurar que los nombres de roles sean únicos por organización
RoleSchema.index({ name: 1, organization: 1 }, { unique: true });

export const Role = mongoose.model<IRole>('Role', RoleSchema);

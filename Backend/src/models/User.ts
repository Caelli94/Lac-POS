import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    name: string;
    email: string;
    organization?: string | any; // Allow ID or populated object
    password?: string;
    role: string;
    roleId?: mongoose.Types.ObjectId | any;
    failedLoginAttempts: number;
    lockUntil?: Date;
    // Session Management
    sessionToken?: string;
    lastLoginIP?: string;
    lastLoginDevice?: string;
    lastLoginTime?: Date;
    isAuditManager: boolean;
    setupToken?: string;
    setupTokenExpires?: Date;
    twoFactorSecret?: string;
    twoFactorEnabled?: boolean;
    recoveryCodes?: string[];
    settings?: {
        theme?: any;
        theme_name?: string;
        theme_templates?: any[];
    };
    matchPassword: (enteredPassword: string) => Promise<boolean>;
}

const UserSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role' },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    // Session Management
    sessionToken: { type: String },
    lastLoginIP: { type: String },
    lastLoginDevice: { type: String },
    lastLoginTime: { type: Date },
    isAuditManager: { type: Boolean, default: false },
    setupToken: { type: String },
    setupTokenExpires: { type: Date },
    twoFactorSecret: { type: String, select: false },
    twoFactorEnabled: { type: Boolean, default: false },
    recoveryCodes: { type: [String], select: false },
    settings: {
        theme: { type: Object },
        theme_name: { type: String },
        theme_templates: { type: [Object], default: [] }
    }
}, {
    timestamps: true
});

// Encriptar password antes de guardar
UserSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password!, salt);
});

// Método para comparar passwords
UserSchema.methods.matchPassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password!);
};

export const User = mongoose.model<IUser>('User', UserSchema);

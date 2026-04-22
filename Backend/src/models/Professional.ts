import mongoose, { Document, Schema } from 'mongoose';

export interface IProfessional extends Document {
    name: string;
    specialty: string;
    organization_id: mongoose.Types.ObjectId;
    phone?: string;
    email?: string;
    color?: string; // For calendar visualization
    working_hours: {
        day: string;
        enabled: boolean;
        slots: {
            start: string;
            end: string;
        }[];
    }[];
    is_active: boolean;
    appointment_duration: number;
}

const ProfessionalSchema: Schema = new Schema({
    name: { type: String, required: true },
    specialty: { type: String },
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    phone: { type: String },
    email: { type: String },
    color: { type: String, default: '#6366f1' },
    working_hours: [{
        day: { type: String },
        enabled: { type: Boolean, default: true },
        slots: [{
            start: { type: String, default: '09:00' },
            end: { type: String, default: '18:00' }
        }]
    }],
    is_active: { type: Boolean, default: true },
    appointment_duration: { type: Number, default: 30 }
}, {
    timestamps: true
});

ProfessionalSchema.index({ organization_id: 1 });

export const Professional = mongoose.model<IProfessional>('Professional', ProfessionalSchema);

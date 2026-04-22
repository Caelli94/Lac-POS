import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
    organization_id: mongoose.Types.ObjectId;
    branch_id?: mongoose.Types.ObjectId;
    client_id?: mongoose.Types.ObjectId;
    guest_name?: string;
    guest_phone?: string;
    date: Date;
    end_date?: Date;
    service_description: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
    notes?: string;
    reminder_sent: boolean;
    reminder_sent_at?: Date;
    professional_id?: mongoose.Types.ObjectId;
    created_by?: mongoose.Types.ObjectId;
    deleted: boolean;
}

const AppointmentSchema: Schema = new Schema({
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    client_id: { type: Schema.Types.ObjectId, ref: 'Customer' },
    guest_name: { type: String },
    guest_phone: { type: String },
    date: { type: Date, required: true },
    end_date: { type: Date },
    service_description: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
        default: 'pending'
    },
    notes: { type: String },
    reminder_sent: { type: Boolean, default: false },
    reminder_sent_at: { type: Date },
    professional_id: { type: Schema.Types.ObjectId, ref: 'Professional' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    deleted: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Indexes for performance
AppointmentSchema.index({ organization_id: 1, date: 1 });
AppointmentSchema.index({ client_id: 1 });
AppointmentSchema.index({ status: 1 });
AppointmentSchema.index({ guest_name: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);

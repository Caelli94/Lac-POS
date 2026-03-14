import mongoose, { Schema, Document } from 'mongoose';

export interface ITicketSettings extends Document {
    organization_id: mongoose.Types.ObjectId | string;
    header_text?: string;
    footer_text?: string;
    logo_url?: string;
    show_tax_id?: boolean;
    show_customer_info?: boolean;

    paper_width?: '58mm' | '80mm';
    use_general_data?: boolean;
}

const TicketSettingsSchema: Schema = new Schema({
    organization_id: { type: Schema.Types.Mixed, required: true, unique: true },
    header_text: { type: String },
    footer_text: { type: String },
    logo_url: { type: String },
    show_tax_id: { type: Boolean, default: true },
    show_customer_info: { type: Boolean, default: true },

    paper_width: { type: String, enum: ['58mm', '80mm'], default: '80mm' },
    use_general_data: { type: Boolean, default: false }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const TicketSettings = mongoose.model<ITicketSettings>('TicketSettings', TicketSettingsSchema);

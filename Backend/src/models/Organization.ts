import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
    name: string;
    slug: string;
    logo?: string;
    subscription_status?: string;
    address?: string;
    phone?: string;
    email_contact?: string;
    tax_id?: string;
    subscription_details?: {
        start_date?: Date;
        period?: string;
        amount?: number;
        currency?: string;
        payment_method?: string;
        next_due_date?: Date;
        last_payment_date?: Date;
        notes?: string;
    };
    features?: { code: string; is_enabled: boolean }[];
    settings?: {
        disabled_tabs?: string[];
        inventory?: {
            custom_attributes?: { name: string; type: string; options?: string[] }[];
            variant_labels?: { color?: string; size?: string };
            price_lists?: { id: string; name: string; is_active: boolean }[];
        };
        theme_name?: string;
        theme?: {
            primary_color?: string;
            border_radius?: string;
            shadow_intensity?: string;
            shadow_color?: string;
            button_shadow?: string;
            text_shadow?: string;
            form_shadow?: string;
            typography?: {
                font_family?: string;
                bold?: boolean;
                underline?: boolean;
                title_font?: string;
                title_bold?: boolean;
                title_underline?: boolean;
                subtitle_font?: string;
                subtitle_bold?: boolean;
                subtitle_underline?: boolean;
                text_font?: string;
                text_bold?: boolean;
                text_underline?: boolean;
                sidebar_font?: string;
                sidebar_size?: string;
                sidebar_bold?: boolean;
                sidebar_underline?: boolean;
                title_size?: string;
                subtitle_size?: string;
                text_size?: string;
                title_color?: string;
                subtitle_color?: string;
                text_color?: string;
            };
            forms?: {
                input_height?: string;
                input_border_color?: string;
                label_size?: string;
            };
            buttons?: {
                border_radius?: string;
                text_transform?: string;
                font_weight?: string;
                shadow?: string;
            };
            light?: {
                background?: string;
                card?: string;
                foreground?: string;
            };
            dark?: {
                background?: string;
                card?: string;
                foreground?: string;
            };
            sidebar?: {
                light_bg?: string;
                light_border?: string;
                light_item_hover?: string;
                light_text?: string;
                light_active_bg?: string;
                light_active_text?: string;
                dark_bg?: string;
                dark_border?: string;
                dark_item_hover?: string;
                dark_text?: string;
                dark_active_bg?: string;
                dark_active_text?: string;
            };
        };
        theme_templates?: {
            name: string;
            config: any;
        }[];
        users_limit?: number;
        products_limit?: number;
        suppliers_limit?: number;
        customers_limit?: number;
        price_lists_limit?: number;
        branches_limit?: number;
        pos_limit?: number;
        ai?: {
            max_messages_per_hour?: number;
            daily_limit?: number;
            usage?: {
                hour_count: number;
                day_count: number;
                last_update: Date;
            };
        };
        appointments?: {
            working_hours?: {
                day: string;
                enabled: boolean;
                start: string;
                end: string;
            }[];
            default_duration?: number;
            whatsapp_template?: string;
            self_booking_enabled?: boolean;
            max_booking_days?: number;
        };
    };
    barcodeSettings?: {
        enabled: boolean;
        defaultFormat: string;
        showText: boolean;
        height: number;
        width: number;
        labelWidth: number;
        labelHeight: number;
    };
    afip_settings?: {
        enabled: boolean;
        mode: 'testing' | 'production';
        cuit?: string;
        cert_path?: string;
        key_path?: string;
        sales_point?: number;
        cert_expiration?: Date;
        gross_income?: string;
        start_activity_date?: string;
        tax_condition?: string;
    };
    ai_assistant_enabled?: boolean;
    commissions_enabled?: boolean;
    advanced_commissions?: boolean;
    integrations_config?: {
        mercadopago?: {
            public_key?: string;
            access_token?: string;
            is_enabled?: boolean;
        };
        tiendanube?: {
            store_id?: string;
            access_token?: string;
            is_enabled?: boolean;
        };
        wix?: {
            api_key?: string;
            site_id?: string;
            is_enabled?: boolean;
        };
    };
}

const OrganizationSchema: Schema = new Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    logo: { type: String },
    subscription_status: { type: String, default: 'active' },
    address: { type: String },
    phone: { type: String },
    email_contact: { type: String },
    tax_id: { type: String },
    subscription_details: {
        start_date: { type: Date },
        period: { type: String },
        amount: { type: Number },
        currency: { type: String, default: 'ARS' },
        payment_method: { type: String },
        next_due_date: { type: Date },
        last_payment_date: { type: Date },
        notes: { type: String }
    },
    features: [{
        code: { type: String },
        is_enabled: { type: Boolean, default: false }
    }],
    settings: {
        disabled_tabs: [{ type: String }],
        inventory: {
            custom_attributes: [{
                name: { type: String },
                type: { type: String },
                options: [{ type: String }]
            }],
            variant_labels: {
                color: { type: String, default: 'Color' },
                size: { type: String, default: 'Talle' }
            },
            price_lists: [{
                id: { type: String },
                name: { type: String },
                is_active: { type: Boolean, default: true }
            }]
        },
        theme_name: { type: String },
        theme: { type: Schema.Types.Mixed, default: {} },
        theme_templates: [{
            name: { type: String },
            config: { type: Object }
        }],
        // LIMITIS DE PRESTACIONES
        users_limit: { type: Number, default: 5 },
        products_limit: { type: Number, default: 100 },
        suppliers_limit: { type: Number, default: 20 },
        customers_limit: { type: Number, default: 50 },
        price_lists_limit: { type: Number, default: 5 },
        branches_limit: { type: Number, default: 1 },
        pos_limit: { type: Number, default: 1 },
        ai: {
            max_messages_per_hour: { type: Number, default: 50 },
            daily_limit: { type: Number, default: 200 },
            usage: {
                hour_count: { type: Number, default: 0 },
                day_count: { type: Number, default: 0 },
                last_update: { type: Date, default: Date.now }
            }
        },
        appointments: {
            working_hours: [{
                day: { type: String },
                enabled: { type: Boolean, default: true },
                start: { type: String, default: '09:00' },
                end: { type: String, default: '18:00' }
            }],
            default_duration: { type: Number, default: 30 },
            whatsapp_template: { type: String, default: 'Hola {{client}}! Te recordamos tu turno el {{date}} a las {{time}} hs por {{service}}. Te esperamos!' },
            self_booking_enabled: { type: Boolean, default: false },
            max_booking_days: { type: Number, default: 30 }
        }
    },
    barcodeSettings: {
        enabled: { type: Boolean, default: false },
        defaultFormat: { type: String, default: 'CODE128' },
        showText: { type: Boolean, default: true },
        height: { type: Number, default: 50 },
        width: { type: Number, default: 2 },
        labelWidth: { type: Number, default: 50 }, // mm
        labelHeight: { type: Number, default: 25 } // mm
    },
    afip_settings: {
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ['testing', 'production'], default: 'testing' },
        cuit: { type: String },
        cert_path: { type: String },
        key_path: { type: String },
        sales_point: { type: Number, default: 1 },
        cert_expiration: { type: Date },
        // Fiscal Profile
        gross_income: { type: String }, // IIBB
        start_activity_date: { type: String }, // Can be string for simplicity YYYY-MM-DD
        tax_condition: { type: String, default: 'RESPONSABLE INSCRIPTO' }
    },
    ai_assistant_enabled: { type: Boolean, default: false },
    commissions_enabled: { type: Boolean, default: false },
    advanced_commissions: { type: Boolean, default: false },
    integrations_config: {
        mercadopago: {
            public_key: String,
            access_token: String,
            is_enabled: { type: Boolean, default: false }
        },
        tiendanube: {
            store_id: String,
            access_token: String,
            is_enabled: { type: Boolean, default: false }
        },
        wix: {
            api_key: String,
            site_id: String,
            is_enabled: { type: Boolean, default: false }
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);

import { Request, Response } from 'express';
import { Organization } from '../models/Organization';
import { Professional } from '../models/Professional';
import { Appointment } from '../models/Appointment';

export const publicBookingController = {
    getOrgPublicDetails: async (req: Request, res: Response) => {
        try {
            const { slug } = req.params;
            const org = await Organization.findOne({ slug });

            if (!org) {
                return res.status(404).json({ success: false, message: 'Organización no encontrada' });
            }

            // Solo devolvemos datos públicos y la config de turnos
            const publicData = {
                id: org._id,
                name: org.name,
                logo: (org as any).logo,
                settings: {
                    appointments: org.settings?.appointments || {}
                }
            };

            res.json({ success: true, data: publicData });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al obtener datos' });
        }
    },

    getProfessionals: async (req: Request, res: Response) => {
        try {
            const { orgId } = req.params;
            const professionals = await Professional.find({ 
                organization_id: orgId,
                is_active: true 
            }).select('name specialty color working_hours');

            res.json({ success: true, data: professionals });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al obtener profesionales' });
        }
    },

    createAppointment: async (req: Request, res: Response) => {
        try {
            const { organization_id, guest_name, guest_phone, date, end_date, service_description, professional_id, notes } = req.body;

            // Validar que la organización tenga activas las reservas públicas
            const org = await Organization.findById(organization_id);
            if (!org?.settings?.appointments?.self_booking_enabled) {
                return res.status(403).json({ success: false, message: 'Las reservas online no están habilitadas para este comercio' });
            }

            const newAppointment = new Appointment({
                organization_id,
                guest_name,
                guest_phone,
                date,
                end_date,
                service_description,
                professional_id: professional_id || undefined,
                notes,
                status: 'pending', // Siempre pendiente cuando es reserva pública
            });

            await newAppointment.save();
            res.status(201).json({ success: true, data: newAppointment });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al crear el turno' });
        }
    }
};

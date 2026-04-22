import { Request, Response } from 'express';
import { Organization } from '../models/Organization';
import { Professional } from '../models/Professional';
import { Appointment } from '../models/Appointment';
import { z } from 'zod';

const BookingSchema = z.object({
    organization_id: z.string().min(10),
    guest_name: z.string().min(2).max(100).transform(val => val.trim()),
    guest_phone: z.string().min(6).max(20).transform(val => val.replace(/[^0-9+]/g, '')),
    date: z.string().datetime(),
    end_date: z.string().datetime(),
    service_description: z.string().min(1).max(200).transform(val => val.trim()),
    professional_id: z.string().optional().nullable(),
    notes: z.string().max(500).optional().nullable().transform(val => val?.trim())
});

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
            }).select('name specialty color working_hours appointment_duration');

            res.json({ success: true, data: professionals });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al obtener profesionales' });
        }
    },

    createAppointment: async (req: Request, res: Response) => {
        try {
            // 1. Validar y Sanitizar entrada con Zod
            const result = BookingSchema.safeParse(req.body);
            
            if (!result.success) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Datos de reserva inválidos',
                    errors: result.error.format() 
                });
            }

            const { 
                organization_id, 
                guest_name, 
                guest_phone, 
                date, 
                end_date, 
                service_description, 
                professional_id, 
                notes 
            } = result.data;

            // 2. Validar que la organización exista y tenga activas las reservas públicas
            const org = await Organization.findById(organization_id);
            if (!org?.settings?.appointments?.self_booking_enabled) {
                return res.status(403).json({ success: false, message: 'Las reservas online no están habilitadas para este comercio' });
            }

            // 3. Crear el turno
            const newAppointment = new Appointment({
                organization_id,
                guest_name,
                guest_phone,
                date: new Date(date),
                end_date: new Date(end_date),
                service_description,
                professional_id: professional_id || undefined,
                notes,
                status: 'pending', 
            });

            await newAppointment.save();
            res.status(201).json({ success: true, data: newAppointment });
        } catch (error) {
            console.error('Error creating public appointment:', error);
            res.status(500).json({ success: false, message: 'Error al procesar la reserva' });
        }
    }
};

import { Request, Response } from 'express';
import { Appointment } from '../models/Appointment';
import mongoose from 'mongoose';

// @desc    Get all appointments for an organization
// @route   GET /api/appointments/:orgId
export const getAppointments = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const { from, to } = req.query;

        let query: any = { organization_id: orgId };

        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from as string);
            if (to) query.date.$lte = new Date(to as string);
        }

        const appointments = await Appointment.find(query)
            .populate('client_id', 'name phone email')
            .sort({ date: 1 });

        res.json({ success: true, data: appointments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener turnos' });
    }
};

// @desc    Create a new appointment
// @route   POST /api/appointments
export const createAppointment = async (req: any, res: Response) => {
    try {
        const { organization_id, client_id, guest_name, guest_phone, date, service_description, notes } = req.body;

        if (!organization_id || (!client_id && !guest_name) || !date || !service_description) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }

        const appointment = await Appointment.create({
            organization_id,
            client_id,
            guest_name,
            guest_phone,
            date,
            service_description,
            notes,
            status: 'pending',
            created_by: req.user._id
        });

        const populated = await appointment.populate('client_id', 'name phone email');

        res.status(201).json({ success: true, data: populated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear el turno' });
    }
};

// @desc    Update appointment status/details
// @route   PUT /api/appointments/:id
export const updateAppointment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const appointment = await Appointment.findByIdAndUpdate(id, updates, { new: true })
            .populate('client_id', 'name phone email');

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        }

        res.json({ success: true, data: appointment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar el turno' });
    }
};

// @desc    Delete an appointment
// @route   DELETE /api/appointments/:id
export const deleteAppointment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findByIdAndDelete(id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        }

        res.json({ success: true, message: 'Turno eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar el turno' });
    }
};

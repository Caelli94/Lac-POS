import { Request, Response } from 'express';
import { Professional } from '../models/Professional';
import { Appointment } from '../models/Appointment';
import { startOfDay, endOfDay, format, addMinutes, parse } from 'date-fns';

export const getProfessionals = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const professionals = await Professional.find({ organization_id: orgId, is_active: true });
        res.json({ success: true, data: professionals });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createProfessional = async (req: any, res: Response) => {
    try {
        const { organization_id, name, specialty, phone, working_hours, color } = req.body;
        const professional = await Professional.create({
            organization_id,
            name,
            specialty,
            phone,
            working_hours,
            color
        });
        res.json({ success: true, data: professional });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateProfessional = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const professional = await Professional.findByIdAndUpdate(id, req.body, { new: true });
        res.json({ success: true, data: professional });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteProfessional = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await Professional.findByIdAndUpdate(id, { is_active: false });
        res.json({ success: true, message: 'Profesional eliminado' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAvailability = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date } = req.query; // Espera formato 'yyyy-MM-dd'

        if (!date) return res.status(400).json({ success: false, message: 'La fecha es requerida' });

        const professional = await Professional.findById(id).populate('organization_id');
        if (!professional) return res.status(404).json({ success: false, message: 'Profesional no encontrado' });

        // 1. Determinar qué horarios usar (Individuales del profesional o de la Organización)
        let working_hours = professional.working_hours;

        // Si el profesional no tiene horarios configurados o el array está vacío, usamos los de la organización
        if (!working_hours || working_hours.length === 0) {
            const org: any = professional.organization_id;
            if (org?.settings?.appointments?.working_hours) {
                working_hours = org.settings.appointments.working_hours;
            }
        }

        if (!working_hours || working_hours.length === 0) {
            return res.json({ success: true, data: [], message: 'No hay horarios configurados' });
        }

        // 2. Obtener el día de la semana para matchear
        const selectedDate = new Date(date as string + 'T00:00:00');
        const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const dayIndex = selectedDate.getDay();
        const dayName = days[dayIndex];

        // Función para normalizar texto (quitar acentos)
        const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

        const dayConfig = working_hours.find(h => normalize(h.day) === normalize(dayName));

        if (!dayConfig) {
            return res.json({ success: true, data: [], message: 'El profesional no trabaja este día' });
        }

        if (!dayConfig.enabled) {
            return res.json({ success: true, data: [], message: 'El profesional no trabaja este día' });
        }

        // 2. Obtener turnos existentes para ese día
        const dayStart = startOfDay(selectedDate);
        const dayEnd = endOfDay(selectedDate);

        const appointments = await Appointment.find({
            professional_id: id,
            date: { $gte: dayStart, $lte: dayEnd },
            status: { $ne: 'cancelled' } // No contar cancelados
        });

        // 3. Generar slots basados en working_hours (soporta slots[] o start/end)
        const availableSlots: any[] = [];
        const duration = professional.appointment_duration || 30;

        // Normalizar los rangos horarios a un array de slots para procesar
        const config: any = dayConfig;
        const timeRanges = config.slots && config.slots.length > 0 
            ? config.slots 
            : (config.start && config.end ? [{ start: config.start, end: config.end }] : []);

        if (timeRanges.length === 0) {
            return res.json({ success: true, data: [], message: 'No hay rangos horarios configurados para este día' });
        }

        timeRanges.forEach((range: any) => {
            let current = parse(range.start, 'HH:mm', selectedDate);
            const end = parse(range.end, 'HH:mm', selectedDate);

            while (current < end) {
                const slotTimeString = format(current, 'HH:mm');
                
                // Verificar si este slot choca con algún appointment
                const isOccupied = appointments.some(app => {
                    const appTime = format(new Date(app.date), 'HH:mm');
                    return appTime === slotTimeString;
                });

                availableSlots.push({
                    time: slotTimeString,
                    available: !isOccupied,
                    professional_id: id
                });

                current = addMinutes(current, duration);
            }
        });

        res.json({ success: true, data: availableSlots });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

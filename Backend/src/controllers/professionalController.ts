import { Request, Response } from 'express';
import { Professional } from '../models/Professional';

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

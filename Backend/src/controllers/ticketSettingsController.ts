import { Request, Response } from 'express';
import { TicketSettings } from '../models/TicketSettings';

// @desc    Get ticket settings
// @route   GET /api/ticket-settings/:orgId
export const getTicketSettings = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const settings = await TicketSettings.findOne({ organization_id: orgId });
        res.json(settings || {});
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Upsert ticket settings
// @route   POST /api/ticket-settings
export const upsertTicketSettings = async (req: Request, res: Response) => {
    try {
        const { organization_id, ...data } = req.body;

        const settings = await TicketSettings.findOneAndUpdate(
            { organization_id },
            { organization_id, ...data },
            { new: true, upsert: true }
        );

        res.json(settings);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

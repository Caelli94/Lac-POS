import { Request, Response } from 'express';
import { Check } from '../models/Check';

// @desc    Get all checks for an organization
// @route   GET /api/checks/:organizationId
// @access  Private
export const getChecks = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;
        const { type, status, search, page = 1, limit = 10 } = req.query;

        const query: any = { organization: organizationId };

        if (type) query.type = type;
        if (status) query.status = status;

        if (search) {
            query.$or = [
                { number: { $regex: search, $options: 'i' } },
                { entity: { $regex: search, $options: 'i' } },
                { cuit: { $regex: search, $options: 'i' } },
                { motive: { $regex: search, $options: 'i' } },
                { bank: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const checks = await Check.find(query)
            .sort({ due_date: 1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Check.countDocuments(query);

        res.json({
            checks,
            total,
            pages: Math.ceil(total / Number(limit)),
            currentPage: Number(page)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener cheques' });
    }
};

// @desc    Create a new check
// @route   POST /api/checks
// @access  Private
export const createCheck = async (req: Request, res: Response) => {
    try {
        const {
            organization, type, number, bank, amount,
            issue_date, due_date, cuit, entity, motive, status, notes
        } = req.body;

        const check = await Check.create({
            organization,
            type,
            number,
            bank,
            amount,
            issue_date,
            due_date,
            cuit,
            entity,
            motive,
            status,
            notes
        });

        res.status(201).json(check);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear cheque' });
    }
};

// @desc    Update a check
// @route   PUT /api/checks/:id
// @access  Private
export const updateCheck = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const check = await Check.findByIdAndUpdate(id, updateData, { new: true });

        if (!check) {
            return res.status(404).json({ message: 'Cheque no encontrado' });
        }

        res.json(check);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar cheque' });
    }
};

// @desc    Delete a check
// @route   DELETE /api/checks/:id
// @access  Private
export const deleteCheck = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const check = await Check.findByIdAndDelete(id);

        if (!check) {
            return res.status(404).json({ message: 'Cheque no encontrado' });
        }

        res.json({ message: 'Cheque eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar cheque' });
    }
};

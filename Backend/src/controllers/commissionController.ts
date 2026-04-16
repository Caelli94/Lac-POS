import { Request, Response } from 'express';
import { CommissionRule } from '../models/CommissionRule';
import { Sale } from '../models/Sale';
import mongoose from 'mongoose';

const areOrgsEqual = (orgA: any, orgB: any): boolean => {
    if (!orgA || !orgB) return false;
    const idA = (orgA._id ? orgA._id.toString() : orgA.toString()).trim();
    const idB = (orgB._id ? orgB._id.toString() : orgB.toString()).trim();
    return idA === idB;
};

// @desc    Get all rules for an organization
// @route   GET /api/commissions/rules/:orgId
export const getRules = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const user = (req as any).user;

        if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, orgId)) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        const rules = await CommissionRule.find({ organization_id: orgId }).sort({ priority: 1 });
        res.json(rules);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new rule
// @route   POST /api/commissions/rules
export const createRule = async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user.organization;
        const rule = await CommissionRule.create({
            ...req.body,
            organization_id: orgId
        });
        res.status(201).json(rule);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a rule
// @route   PATCH /api/commissions/rules/:id
export const updateRule = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const rule = await CommissionRule.findByIdAndUpdate(id, req.body, { new: true });
        if (!rule) return res.status(404).json({ message: 'Rule not found' });
        res.json(rule);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a rule
// @route   DELETE /api/commissions/rules/:id
export const deleteRule = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await CommissionRule.findByIdAndDelete(id);
        res.json({ message: 'Rule deleted' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get commission history (Sales with commissions)
// @route   GET /api/commissions/history/:orgId
export const getHistory = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const { from, to, userId } = req.query;
        const user = (req as any).user;

        if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, orgId)) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        const query: any = {
            organization_id: orgId,
            commission_amount: { $gt: 0 }
        };

        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from as string);
            if (to) query.date.$lte = new Date(to as string);
        }

        if (userId) {
            query.performed_by = userId;
        }

        const history = await Sale.find(query)
            .populate('performed_by', 'name email')
            .sort({ date: -1 })
            .limit(100);

        res.json(history);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

import { Request, Response } from 'express';
import { CommissionRule } from '../models/CommissionRule';
import mongoose from 'mongoose';

// @desc    Get all commission rules for an organization
// @route   GET /api/commissions/rules/:orgId
export const getCommissionRules = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const rules = await CommissionRule.find({ organization_id: orgId })
            .populate('conditions.roles', 'name')
            .populate('conditions.categories', 'name')
            .sort({ priority: 1 });
            
        res.json(rules);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create or update a commission rule
// @route   POST /api/commissions/rules
export const upsertCommissionRule = async (req: Request, res: Response) => {
    try {
        const { _id, organization_id, name, active, priority, conditions, action } = req.body;

        if (_id) {
            // Update
            const rule = await CommissionRule.findByIdAndUpdate(_id, {
                name,
                active,
                priority,
                conditions,
                action
            }, { new: true });
            return res.json(rule);
        } else {
            // Create
            const newRule = await CommissionRule.create({
                organization_id,
                name,
                active,
                priority,
                conditions,
                action
            });
            return res.status(201).json(newRule);
        }
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a commission rule
// @route   DELETE /api/commissions/rules/:id
export const deleteCommissionRule = async (req: Request, res: Response) => {
    try {
        await CommissionRule.findByIdAndDelete(req.params.id);
        res.json({ message: 'Regla de comisión eliminada.' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

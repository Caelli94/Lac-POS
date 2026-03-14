import { Request, Response } from 'express';
import { Category } from '../models/Category';
import mongoose from 'mongoose';

const areOrgsEqual = (orgA: any, orgB: any): boolean => {
    if (!orgA || !orgB) return false;
    const idA = (orgA._id ? orgA._id.toString() : orgA.toString()).trim();
    const idB = (orgB._id ? orgB._id.toString() : orgB.toString()).trim();
    return idA === idB;
};

// @desc    Get all categories for an organization
// @route   GET /api/categories/:orgId
export const getCategories = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const user = (req as any).user;
        const userOrgId = user.organization?._id?.toString() || user.organization?.toString() || '';

        // SECURITY: Strict Tenant Isolation (Exempt Super Admin)
        const isInternalMember = userOrgId && (userOrgId === orgId.toString());
        const isSystemAdmin = user.role === 'superadmin' || user.role === 'admin';

        if (!isInternalMember && !isSystemAdmin) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        // ROBUST QUERY: Account for Mixed type organization_id (ObjectId vs String)
        const orgIdObj = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;
        const categories = await Category.find({
            organization_id: { $in: [orgId, orgIdObj] }
        }).sort({ name: 1 });

        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new category
// @route   POST /api/categories
export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const user = (req as any).user;
        const organization_id = user.organization._id || user.organization;
        const orgIdObj = mongoose.Types.ObjectId.isValid(organization_id) ? new mongoose.Types.ObjectId(organization_id) : organization_id;

        const existingCategory = await Category.findOne({
            organization_id: { $in: [organization_id, orgIdObj] },
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({ message: 'DUPLICADO' });
        }

        const category = await Category.create({
            organization_id,
            name: name.trim()
        });

        res.status(201).json(category);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const user = (req as any).user;

        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        // SECURITY:
        if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, category.organization_id)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        if (name) {
            const existingCategory = await Category.findOne({
                organization_id: category.organization_id,
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                _id: { $ne: id }
            });

            if (existingCategory) {
                return res.status(400).json({ message: 'DUPLICADO' });
            }
            category.name = name.trim();
        }

        await category.save();
        res.json(category);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        // SECURITY:
        if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, category.organization_id)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        await Category.findByIdAndDelete(id);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

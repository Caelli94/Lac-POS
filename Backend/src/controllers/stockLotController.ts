import { Request, Response } from 'express';
import { StockLot } from '../models/StockLot';
import mongoose from 'mongoose';

export const getStockLots = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const { product_id, branch_id, near_expiration } = req.query;

        const query: any = { organization_id: new mongoose.Types.ObjectId(orgId) };

        if (product_id) query.product_id = new mongoose.Types.ObjectId(product_id as string);
        if (branch_id && branch_id !== 'ALL') query.branch_id = new mongoose.Types.ObjectId(branch_id as string);

        if (near_expiration === 'true') {
            const today = new Date();
            const future = new Date();
            future.setDate(today.getDate() + 30); // 30 days default
            query.expiration_date = { $lte: future };
        }

        const lots = await StockLot.find(query)
            .populate('product_id', 'name sku image_url')
            .populate('branch_id', 'name')
            .sort({ expiration_date: 1 });

        res.json({ data: lots });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const adjustStockLot = async (req: Request, res: Response) => {
    try {
        const { orgId, id } = req.params;
        const { stock } = req.body;

        const lot = await StockLot.findOneAndUpdate(
            { _id: id, organization_id: orgId },
            { $set: { stock } },
            { new: true }
        );

        if (!lot) return res.status(404).json({ message: 'Lote no encontrado' });

        res.json({ data: lot });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteStockLot = async (req: Request, res: Response) => {
    try {
        const { orgId, id } = req.params;

        const lot = await StockLot.findOneAndDelete({ _id: id, organization_id: orgId });

        if (!lot) return res.status(404).json({ message: 'Lote no encontrado' });

        res.json({ message: 'Lote eliminado correctamente' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createStockLot = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const { product_id, branch_id, lot_number, expiration_date, stock } = req.body;

        const newLot = new StockLot({
            organization_id: orgId,
            product_id,
            branch_id,
            lot_number,
            expiration_date,
            stock,
            initial_stock: stock
        });

        await newLot.save();
        res.status(201).json({ data: newLot });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

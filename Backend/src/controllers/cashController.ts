import { Request, Response } from 'express';
import { CashMovement, CashRegister, CashSession } from '../models/Cash';
import { Sale } from '../models/Sale';
import { AccountMovement } from '../models/AccountMovement';
import { CustomerAccount } from '../models/CustomerAccount';
import { SupplierAccount } from '../models/SupplierAccount';
import { SupplierAccountMovement } from '../models/SupplierAccountMovement';
import { CustomerOrder } from '../models/CustomerOrder';
import mongoose from 'mongoose';

// @desc    Register a new cash movement
// @route   POST /api/cash/movements
// @access  Private
export const registerMovement = async (req: Request, res: Response) => {
    const {
        organizationId,
        cashRegisterId,
        session, // Allow passing session ID explicitly
        amount,
        type,
        description,
        paymentMethod,
        referenceId
    } = req.body;

    // TODO: Verify user from req.user (middleware)
    // const userId = req.user._id;

    try {
        let activeSessionId = session;

        if (!activeSessionId) {
            // Find active session for this register
            const activeSession = await CashSession.findOne({
                cashRegister: cashRegisterId,
                status: 'open'
            });

            if (!activeSession) {
                return res.status(400).json({ message: 'No hay turno abierto en esta caja.' });
            }
            activeSessionId = activeSession._id;
        }

        // 1. Create Movement
        const movement = await CashMovement.create({
            cashRegister: cashRegisterId,
            session: activeSessionId,
            type,
            amount,
            description,
            paymentMethod,
            referenceId,
            createdBy: (req as any).user._id
        });



        // 2. Update Cash Register Balance
        // If SALE or PAYMENT_RECEIVED -> Add to balance (if cash?)
        // If EXPENSE or WITHDRAWAL -> Subtract
        // NOTE: This logic depends on business rules. Assuming 'amount' is positive.

        let adjustment = 0;
        if (type === 'SALE' || type === 'PAYMENT_RECEIVED' || type === 'IN') {
            // Added 'IN' for manual income
            adjustment = Number(amount);
        } else if (type === 'EXPENSE' || type === 'WITHDRAWAL') {
            adjustment = -Number(amount);
        }

        if (paymentMethod === 'cash' || paymentMethod === 'Efectivo') { // Handle 'Efectivo' form frontend
            await CashRegister.findByIdAndUpdate(cashRegisterId, {
                $inc: { closingBalance: adjustment } // or currentBalance if we had one
            });

        }

        res.status(201).json(movement);

    } catch (error: any) {

        res.status(400).json({ message: error.message });
    }
};

// @desc    Get cash register status
// @route   GET /api/cash/registers/:id
export const getCashRegister = async (req: Request, res: Response) => {
    try {
        const register = await CashRegister.findById(req.params.id).populate('branch_id');
        if (register) {
            res.json(register);
        } else {
            res.status(404).json({ message: 'Cash Register not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}


// @desc    Get cash registers by Organization
// @route   GET /api/cash/registers/org/:orgId
export const retrieveRegistersByOrg = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        let registers = await CashRegister.find({ organization: orgId }).populate('branch_id');

        if (registers.length === 0) {
            // Create default 'PRINCIPAL' register
            const newRegister = await CashRegister.create({
                organization: orgId,
                status: 'closed',
                openingBalance: 0,
                // openedBy: req.user?._id 
            });
            registers = [newRegister];
        }

        // Enrich with Session Stats
        const enrichedRegisters = await Promise.all(registers.map(async (reg) => {
            const r = reg.toObject({ virtuals: true });

            // Find latest session (Open, or last Closed)
            let session = await CashSession.findOne({ cashRegister: reg._id })
                .sort({ openedAt: -1 })
                .populate('openedBy', 'name');

            if (session) {
                // Aggregate Stats
                const stats = await CashMovement.aggregate([
                    { $match: { session: session._id, status: { $ne: 'cancelled' } } },
                    {
                        $group: {
                            _id: null,
                            cashIncome: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $in: ['$type', ['SALE', 'IN', 'PAYMENT_RECEIVED']] },
                                                { $in: ['$paymentMethod', ['cash', 'Efectivo']] }
                                            ]
                                        },
                                        '$amount',
                                        0
                                    ]
                                }
                            },
                            digitalIncome: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $in: ['$type', ['SALE', 'IN', 'PAYMENT_RECEIVED']] },
                                                { $ne: ['$paymentMethod', 'cash'] },
                                                { $ne: ['$paymentMethod', 'Efectivo'] }
                                            ]
                                        },
                                        '$amount',
                                        0
                                    ]
                                }
                            },
                            expenses: {
                                $sum: {
                                    $cond: [
                                        { $in: ['$type', ['EXPENSE', 'WITHDRAWAL', 'OUT']] },
                                        '$amount',
                                        0
                                    ]
                                }
                            }
                        }
                    }
                ]);

                const s = stats[0] || { cashIncome: 0, digitalIncome: 0, expenses: 0 };

                // Calculated Cash Balance
                const calculatedBalance = (session.openingBalance || 0) + s.cashIncome - s.expenses;

                return {
                    ...r,
                    activeSession: {
                        ...session.toObject(),
                        stats: {
                            ...s,
                            calculatedBalance
                        }
                    }
                };
            }

            return {
                ...r,
                activeSession: null
            };
        }));

        res.json(enrichedRegisters);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
// @desc    Create or Update Cash Register
// @route   POST /api/cash/registers
export const upsertRegister = async (req: Request, res: Response) => {
    try {
        const { id, organization_id, name, branch_id, status } = req.body;

        if (id) {
            // Update
            const register = await CashRegister.findByIdAndUpdate(id, {
                name,
                branch_id: branch_id || null, // Allow clearing branch
            }, { new: true }).populate('branch_id');
            return res.json(register);
        } else {
            // Create
            const newRegister = await CashRegister.create({
                organization: organization_id,
                name,
                branch_id: branch_id || null,
                status: 'closed',
                openingBalance: 0
            });
            const populated = await newRegister.populate('branch_id');
            return res.status(201).json(populated);
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Cash Register
// @route   DELETE /api/cash/registers/:id
export const deleteRegister = async (req: Request, res: Response) => {
    try {
        // TODO: Check if it has movements/sessions before deleting
        // For now, simple delete
        await CashRegister.findByIdAndDelete(req.params.id);
        res.json({ message: 'Cash Register deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete/Void a cash movement (Soft Delete)
// @route   DELETE /api/cash/movements/:id
export const deleteMovement = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const movement = await CashMovement.findById(id);

        if (!movement) {
            return res.status(404).json({ message: 'Movement not found' });
        }

        if (movement.status === 'cancelled') {
            return res.status(400).json({ message: 'Movement already cancelled' });
        }

        // Logic to revert balance
        const { type, amount, cashRegister, paymentMethod } = movement;
        let adjustment = 0;

        // If it was IN/SALE -> It added money -> We must SUBTRACT
        if (type === 'SALE' || type === 'PAYMENT_RECEIVED' || type === 'IN') {
            adjustment = -Number(amount);
        }
        // If it was EXPENSE/OUT -> It removed money -> We must ADD BACK
        else if (type === 'EXPENSE' || type === 'WITHDRAWAL') {
            adjustment = Number(amount);
        }

        // Only adjust if it affected cash balance (Efectivo/cash)
        if (paymentMethod === 'cash' || paymentMethod === 'Efectivo') {
            await CashRegister.findByIdAndUpdate(cashRegister, {
                $inc: { closingBalance: adjustment }
            });
        }

        // Soft Delete: Update status instead of delete
        movement.status = 'cancelled';
        await movement.save();

        // CHECK FOR LINKED MOVEMENT (Customer Account, Supplier Account, or Customer Order)
        if (movement.referenceId && mongoose.Types.ObjectId.isValid(movement.referenceId)) {

            // 1. Try finding Customer Account Movement
            const accMov = await AccountMovement.findById(movement.referenceId);

            if (accMov && accMov.status !== 'cancelled') {
                const account = await CustomerAccount.findById(accMov.account_id);
                if (account) {
                    if (accMov.type === 'DEBIT') {
                        account.balance -= accMov.amount;
                    } else {
                        account.balance += accMov.amount;
                    }
                    await account.save();
                    accMov.status = 'cancelled';
                    await accMov.save();
                }
            } else {
                // 2. Try finding Supplier Account Movement
                const suppMov = await SupplierAccountMovement.findById(movement.referenceId);

                if (suppMov && suppMov.status !== 'cancelled') {
                    const suppAccount = await SupplierAccount.findById(suppMov.account_id);
                    if (suppAccount) {
                        if (suppMov.type === 'DEBIT') {
                            suppAccount.balance -= suppMov.amount;
                        } else {
                            suppAccount.balance += suppMov.amount;
                        }
                        await suppAccount.save();
                        suppMov.status = 'cancelled';
                        await suppMov.save();
                    }
                } else {
                    // 3. Try finding Customer Order
                    const order = await CustomerOrder.findById(movement.referenceId);
                    if (order) {
                        // Subtract the voided deposit from the order
                        order.deposit_amount = Math.max(0, (order.deposit_amount || 0) - amount);
                        // If this was the primary payment, clear the ID AND CANCEL the order
                        if (order.cash_movement_id?.toString() === movement._id.toString()) {
                            order.cash_movement_id = undefined;
                            order.status = 'CANCELLED';
                        }
                        await order.save();
                    }
                }
            }
        }

        res.json({ message: 'Movement voided successfully', movement });

    } catch (error: any) {
        console.error("Error voiding movement:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get detailed movements for a register within a date range
// @route   GET /api/cash/registers/:id/movements?from=YYYY-MM-DD&to=YYYY-MM-DD
export const getRegisterMovements = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { from, to } = req.query;



        if (!from || !to) {
            return res.status(400).json({ message: 'Please provide from and to dates' });
        }

        const startDate = new Date(from as string);
        const endDate = new Date(to as string);

        // Align with Argentina Time (UTC-3) strictly, matching SalesController logic.
        // Start: 00:00 ART -> 03:00 UTC
        startDate.setUTCHours(3, 0, 0, 0);

        // End: 23:59 ART (approx) -> 02:59 UTC (next day)
        // Using 26h59m59s999ms from base UTC 00:00 = 02:59:59 UTC next day.
        endDate.setUTCHours(26, 59, 59, 999);



        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 32) {
            return res.status(400).json({ message: 'Rango máximo permitido: 31 días' });
        }

        const movements = await CashMovement.find({
            cashRegister: id,
            date: { $gte: startDate, $lte: endDate }
        })
            .populate('customer', 'name')
            .populate('supplier', 'name')
            .populate({
                path: 'createdBy',
                select: 'name role roleId',
                populate: { path: 'roleId', select: 'name' }
            })
            .sort({ date: -1 });

        const register = await CashRegister.findById(id);
        if (!register) return res.status(404).json({ message: 'Register not found' });

        const sales = await Sale.aggregate([
            {
                $match: {
                    organization_id: register.organization,
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            { $sort: { date: -1 } },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customer_id',
                    foreignField: '_id',
                    as: 'customers'
                }
            },
            { $unwind: { path: '$customers', preserveNullAndEmptyArrays: true } },
            // Lookup Performer (User)
            {
                $lookup: {
                    from: 'users',
                    localField: 'performed_by',
                    foreignField: '_id',
                    pipeline: [
                        { $project: { name: 1, role: 1, roleId: 1 } }
                    ],
                    as: 'performer'
                }
            },
            { $unwind: { path: '$performer', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'roles',
                    localField: 'performer.roleId',
                    foreignField: '_id',
                    pipeline: [
                        { $project: { name: 1 } }
                    ],
                    as: 'performerRole'
                }
            },
            { $unwind: { path: '$performerRole', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    'performer.roleId': '$performerRole'
                }
            },
            {
                $project: {
                    performerRole: 0
                }
            },
            {
                $lookup: {
                    from: 'saleitems',
                    let: { saleId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$sale_id', '$$saleId'] } } },
                        {
                            $lookup: {
                                from: 'products',
                                let: { pid: '$product_id' },
                                pipeline: [
                                    { $match: { $expr: { $eq: ['$_id', { $toObjectId: '$$pid' }] } } }
                                ],
                                as: 'product_details'
                            }
                        },
                        { $unwind: { path: '$product_details', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'suppliers',
                                localField: 'product_details.supplier_id',
                                foreignField: '_id',
                                as: 'product_details.supplier'
                            }
                        },
                        { $unwind: { path: '$product_details.supplier', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'categories',
                                localField: 'product_details.category_ids',
                                foreignField: '_id',
                                as: 'product_details.category_ids'
                            }
                        }
                    ],
                    as: 'sale_items'
                }
            }
        ]);

        res.json({ movements, sales });
    } catch (error: any) {
        console.error(`[getRegisterMovements] Error:`, error);
        res.status(500).json({ message: error.message });
    }
};

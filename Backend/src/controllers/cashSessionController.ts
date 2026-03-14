import { Request, Response } from 'express';
import { CashSession, CashRegister, CashMovement } from '../models/Cash';
import { Sale } from '../models/Sale'; // Assuming Sale model exists

// @desc    Open a new cash session
// @route   POST /api/cash/sessions/open
export const openSession = async (req: Request, res: Response) => {
    try {
        const { organizationId, cashRegisterId, openingBalance, userId, cashierName, shiftName, notes } = req.body;

        // Check if there is already an open session for this register
        const existingSession = await CashSession.findOne({
            cashRegister: cashRegisterId,
            status: 'open'
        });

        if (existingSession) {
            return res.status(400).json({ message: 'Ya existe un turno abierto para esta caja.' });
        }

        const session = await CashSession.create({
            organization: organizationId,
            cashRegister: cashRegisterId,
            openedBy: userId,
            openingBalance,
            status: 'open',
            openedAt: new Date(),
            cashierName,
            shiftName,
            notes
        });

        // Update Register Status
        await CashRegister.findByIdAndUpdate(cashRegisterId, {
            status: 'open',
            openingBalance,
            openedAt: new Date(),
            openedBy: userId
        });

        res.status(201).json(session);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Close a cash session
// @route   POST /api/cash/sessions/:id/close
export const closeSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { closingBalance, notes, userId, cashierName, shiftName } = req.body;

        const session = await CashSession.findById(id);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        if (session.status === 'closed') return res.status(400).json({ message: 'Session already closed' });

        // Calculate expected balance
        // 1. Get Sales in CASH linked to this session (assuming Sales have session_id)
        // If Sales don't link to session yet, we might need to query by time range or ensure link.
        // For now, let's assume Sales have 'session_id' or we query by date range [openedAt, NOW] for that register.
        // MIGRATION NOTE: Sales should trigger CashMovement? Or we query Sales directly? 
        // Best practice: Sales create CashMovements. Queries on CashMovements are cleaner.

        const movements = await CashMovement.find({ session: id });

        let totalCashIn = 0;
        let totalCashOut = 0;

        for (const m of movements) {
            // Case-insensitive check for Cash payment method
            const method = (m.paymentMethod || '').toLowerCase();
            if (['cash', 'efectivo', 'count'].includes(method)) {
                if (['SALE', 'PAYMENT_RECEIVED', 'IN', 'INGRESO'].includes(m.type) || (m.type as string) === 'Venta') { // Also checking localized types if saved that way
                    totalCashIn += m.amount;
                } else {
                    totalCashOut += m.amount;
                }
            }
        }

        // Fetch Sales linked to this session
        const sales = await Sale.find({ session_id: id, status: { $ne: 'cancelled' } });

        for (const sale of sales) {
            if (sale.payments && Array.isArray(sale.payments)) {
                sale.payments.forEach(p => {
                    const pMethod = (p.method || '').toLowerCase();
                    if (pMethod === 'cash' || pMethod === 'efectivo') {
                        totalCashIn += p.amount;
                    }
                });
            } else if ((sale as any).payment_method === 'cash') {
                // Fallback for legacy data
                totalCashIn += sale.total_amount;
            }
        }

        const expectedBalance = session.openingBalance + totalCashIn - totalCashOut;

        session.status = 'closed';
        session.closingBalance = closingBalance;
        session.expectedBalance = expectedBalance;
        session.closedAt = new Date();
        session.closedBy = userId;
        session.notes = notes;
        session.cashierName = cashierName;
        session.shiftName = shiftName;
        await session.save();

        // Update Register
        await CashRegister.findByIdAndUpdate(session.cashRegister, {
            status: 'closed',
            closingBalance,
            closedAt: new Date()
        });

        res.json(session);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get active session for a register
// @route   GET /api/cash/registers/:registerId/session
export const getActiveSession = async (req: Request, res: Response) => {
    try {
        const { registerId } = req.params;
        console.log(`[getActiveSession] Searching for open session for Register ID: ${registerId}`);
        const session = await CashSession.findOne({ cashRegister: registerId, status: 'open' });
        console.log(`[getActiveSession] Found:`, session ? session._id : "NULL");
        res.json(session || null);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get session history
// @route   GET /api/cash/registers/:registerId/history
export const getSessionHistory = async (req: Request, res: Response) => {
    try {
        const { registerId } = req.params;
        const { from, to } = req.query;

        let query: any = { cashRegister: registerId, status: 'closed' };

        if (from && to) {
            const startDate = new Date(from as string);
            const endDate = new Date(to as string);

            // Validate
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                endDate.setUTCHours(23, 59, 59, 999); // End of day
                query.closedAt = { $gte: startDate, $lte: endDate };
            }
        }

        const sessions = await CashSession.find(query)
            .sort({ closedAt: -1 })
            .limit(from && to ? 1000 : 20); // If filtered, allow more results, else limit to recent

        res.json(sessions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get session details (sales + movements)
// @route   GET /api/cash/sessions/:id/details
export const getSessionDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Fetch movements
        const movements = await CashMovement.find({ session: id })
            .populate('customer', 'name')
            .populate('supplier', 'name')
            .sort({ createdAt: -1 });

        // Fetch sales (if linked by session_id in Sale model, otherwise query by date range?)
        // Assuming Sale model now has session_id or we query movements of type SALE.
        // If Sales are stored in 'sales' collection separately:
        // const sales = await Sale.find({ session_id: id }).populate('customer');

        // For strict backend consistency with the frontend "SessionDetails" view:
        const sales = await Sale.aggregate([
            { $match: { session_id: id } },
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
                                as: 'product_details.categories'
                            }
                        }
                    ],
                    as: 'sale_items'
                }
            },
            { $addFields: { id: { $toString: "$_id" } } }
        ]);

        res.json({ movements, sales });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get history for the entire organization with filters
// @route   GET /api/cash/org/:organizationId/history
// @desc    Get history for the entire organization with filters and pagination
// @route   GET /api/cash/org/:organizationId/history
export const getOrganizationHistory = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;
        const { from, to, branchId, registerId, includeOpen, page, limit } = req.query;

        // Pagination defaults
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 20;
        const skip = (pageNum - 1) * limitNum;

        let query: any = { organization: organizationId };

        // 1. Filter by Register directly
        if (registerId && registerId !== 'all') {
            query.cashRegister = registerId;
        }
        // 2. Filter by Branch (if no specific register selected)
        else if (branchId && branchId !== 'all') {
            const registers = await CashRegister.find({ branch_id: branchId }).select('_id');
            const registerIds = registers.map(r => r._id);
            query.cashRegister = { $in: registerIds };
        }

        // 3. Status Filter
        if (includeOpen !== 'true') {
            query.status = 'closed';
        }

        // 4. Date Filter
        if (from && to) {
            // Simple String Comparison if stored as ISO strings or Date objects match
            // Ideally use Date objects for $gte/$lte
            const startDate = new Date(from as string);
            const endDate = new Date(to as string);

            // Adjust to cover the full day in UTC/Local logic or strict comparison
            // Assuming 'openedAt' is the key date
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                endDate.setUTCHours(23, 59, 59, 999);
                query.openedAt = { $gte: startDate, $lte: endDate };
            }
        }

        // --- PIPELINE FOR EFFICIENCY ---
        // Using aggregation to fetch session + stats efficiently without N+1 queries
        // Steps:
        // 1. Match Sessions based on query
        // 2. Sort by openedAt desc
        // 3. Facet for Metadata (count) and Data (skip/limit + lookup stats)

        const pipeline: any[] = [
            { $match: query },
            { $sort: { openedAt: -1 } },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $skip: skip },
                        { $limit: limitNum },
                        // Populate Cash Register
                        {
                            $lookup: {
                                from: 'cashregisters',
                                localField: 'cashRegister',
                                foreignField: '_id',
                                as: 'cashRegister'
                            }
                        },
                        { $unwind: { path: '$cashRegister', preserveNullAndEmptyArrays: true } },
                        // Populate Branch inside Register (Multilevel lookup needs proper pipeline or second lookup)
                        // Since branch_id is in cashRegister, we can lookup branches
                        {
                            $lookup: {
                                from: 'branches',
                                localField: 'cashRegister.branch_id',
                                foreignField: '_id',
                                as: 'cashRegister.branch_id'
                            }
                        },
                        { $unwind: { path: '$cashRegister.branch_id', preserveNullAndEmptyArrays: true } },
                        // Populate User (OpenedBy)
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'openedBy',
                                foreignField: '_id',
                                as: 'openedBy'
                            }
                        },
                        { $unwind: { path: '$openedBy', preserveNullAndEmptyArrays: true } },

                        // --- STATS AGGREGATION (Sub-pipeline for this session) ---
                        // This is expensive ($lookup on movements per session). 
                        // Alternative: Just return session data and let frontend fetch details on expand? 
                        // OR: Compute simplified stats like final balance.

                        // Replicating original logic: We need cashIncome, expenses, etc.
                        {
                            $lookup: {
                                from: 'cashmovements',
                                let: { sessionId: '$_id' },
                                pipeline: [
                                    { $match: { $expr: { $eq: ['$session', '$$sessionId'] }, status: { $ne: 'cancelled' } } },
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
                                ],
                                as: 'statsData'
                            }
                        },
                        { $unwind: { path: '$statsData', preserveNullAndEmptyArrays: true } },
                        {
                            $addFields: {
                                'stats.cashIncome': { $ifNull: ['$statsData.cashIncome', 0] },
                                'stats.expenses': { $ifNull: ['$statsData.expenses', 0] },
                                'stats.calculatedBalance': {
                                    $subtract: [
                                        { $add: [{ $ifNull: ['$openingBalance', 0] }, { $ifNull: ['$statsData.cashIncome', 0] }] },
                                        { $ifNull: ['$statsData.expenses', 0] }
                                    ]
                                }
                            }
                        },
                        { $project: { statsData: 0 } } // Cleanup
                    ]
                }
            }
        ];

        const result = await CashSession.aggregate(pipeline);

        const metadata = result[0].metadata[0] || { total: 0 };
        const data = result[0].data || [];

        res.json({
            data,
            pagination: {
                total: metadata.total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(metadata.total / limitNum)
            }
        });

    } catch (error: any) {
        console.error("Error getting organization history:", error);
        res.status(500).json({ message: error.message });
    }
};

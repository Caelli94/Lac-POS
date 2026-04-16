import { Request, Response } from 'express';
import { Sale, SaleItem } from '../models/Sale';
import { Product } from '../models/Product';
import { CashSession, CashMovement, CashRegister } from '../models/Cash'; // Import CashSession
import { CustomerAccount } from '../models/CustomerAccount';
import { AccountMovement } from '../models/AccountMovement';
import { StockLot } from '../models/StockLot';
import mongoose from 'mongoose';
import { IntegrationService } from '../services/IntegrationService';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { CommissionService } from '../services/CommissionService';

const areOrgsEqual = (orgA: any, orgB: any): boolean => {
    if (!orgA || !orgB) return false;
    const idA = (orgA._id ? orgA._id.toString() : orgA.toString()).trim();
    const idB = (orgB._id ? orgB._id.toString() : orgB.toString()).trim();
    return idA === idB;
};

// @desc    Create a new sale
// @route   POST /api/sales
export const createSale = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log("Creating Sale Payload:", JSON.stringify(req.body, null, 2));

        const organizationPopulated = (req as any).user.organization; // Securely get from Token
        const orgId = organizationPopulated?._id?.toString() || organizationPopulated?.toString();
        const {
            // orgId, // REMOVED: Do not trust body
            totalAmount,
            cart,
            customerId,
            payments, // Now receiving an array
            paymentMethod, // Fallback for old frontend
            sessionId,
            document_type = 'ticket',
            discount_general,
            surcharge_general,
            rounding_difference,
            invoice_letter,
            fiscal_data,
            manual_tax_added
        } = req.body;

        // Construct payments array if standard 'paymentMethod' was sent
        let finalPayments = payments;
        if (!finalPayments || finalPayments.length === 0) {
            finalPayments = [{
                method: paymentMethod || 'cash',
                amount: totalAmount
            }];
        }

        // 1. Create Sale Header
        const sale = await Sale.create([{
            organization_id: orgId,
            customer_id: customerId && mongoose.Types.ObjectId.isValid(customerId) ? new mongoose.Types.ObjectId(customerId) : undefined,
            session_id: sessionId,
            total_amount: totalAmount,
            payments: finalPayments,
            discount_general,
            surcharge_general,
            rounding_difference: rounding_difference || 0,
            status: 'completed',
            date: new Date(),
            performed_by: (req as any).user._id,
            document_type,
            invoice_letter,
            fiscal_data,
            manual_tax_added,
            source: req.body.source || 'local'
        }], { session });

        const saleId = sale[0]._id;

        // 1.5 Get Branch ID from Session
        const currentSession = await CashSession.findById(sessionId).populate({
            path: 'cashRegister',
            populate: { path: 'branch_id' }
        });

        // Safe access to branch ID.
        const branchId = (currentSession?.cashRegister as any)?.branch_id?._id?.toString() || (currentSession?.cashRegister as any)?.branch_id?.toString();

        console.log("Active Branch ID for Stock:", branchId);

        // 2. Create Items and Update Stock
        // 2. Create Items and Update Stock
        // OPTIMIZATION: Bulk fetch all products involved in the cart
        const productIds = cart.map((i: any) => i.id);
        const productIdsSet = new Set(productIds); // Deduplicate IDs effectively
        const productsMap = new Map();

        // Find all products in one go
        const productsFound = await Product.find({ _id: { $in: Array.from(productIdsSet) } }).session(session);
        productsFound.forEach(p => productsMap.set(p._id.toString(), p));

        let recalculatedTotal = 0;
        let totalCost = 0;

        for (const item of cart) {
            // Fetch Product from Map (Pre-fetched)
            const product = productsMap.get(item.id);

            if (!product) throw new Error(`Producto no encontrado: ${item.name}`);

            // SERVER-SIDE PRICE VALIDATION (Anti-Hack)
            // We must determine the correct price based on the organization's rules and price lists
            let expectedPrice = product.price;

            // If a price list was used, we must find the price in that list
            // Note: The frontend should send which price list ID was used, or we can infer it if we know the context.
            // For now, if the frontend sends a price, we check if it matches ANY of the valid prices for that product.
            // This is a "flexible but secure" approach.
            const validPrices = [product.price, ...(product.pricing?.map((p: any) => p.price) || [])];

            // Allow for a small rounding tolerance (e.g., 0.01)
            const isPriceValid = validPrices.some(p => Math.abs(p - item.price) < 0.1);

            // SPECIAL CASE: 'Varios' or Misc items usually have a random price. 
            // We should identify them (e.g., SKU: 'VARIOUS' or similar) to skip validation if needed.
            const isMiscItem = item.name.startsWith('(Varios)');

            if (!isPriceValid && !isMiscItem) {
                console.warn(`[SECURITY] Price mismatch for product ${item.name}. Received: ${item.price}, Expected one of: ${validPrices}`);
                // In context of offline sync, we might want to flag this but still allow it if we trust the business flow,
                // BUT for "Anti-Hack" we should be strict.
                throw new Error(`Precio inválido para el producto ${item.name}. El servidor detectó una discrepancia.`);
            }

            // Recalculate Total
            recalculatedTotal += item.price * item.quantity;
            totalCost += (product.cost || 0) * item.quantity;

            // Create Sale Item
            await SaleItem.create([{
                sale_id: saleId,
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                total_price: item.price * item.quantity,
                discount: item.discount,
                tax_rate: item.tax_rate ?? 21.0,
                exclude_from_general_discount: item.exclude_from_general_discount,
                variant_id: item.variant_id,
                variant_name: item.variant_name
            }], { session });

            if (product) {
                let stockUpdated = false;

                // A. VARIANT LOGIC
                if (product.variants && product.variants.length > 0 && branchId) {

                    let targetVariant = null;

                    // 1. Try to find by ID if provided
                    if (item.variant_id) {
                        targetVariant = product.variants.find((v: any) => (v as any)._id.toString() === item.variant_id);
                    }

                    // 2. Fallback: Find matching variant by Name (if legacy or ID missing)?
                    // Not reliable.

                    // 3. Fallback: Find first with stock (Legacy behavior, discouraged but keeps system running if frontend outdated)
                    if (!targetVariant && !item.variant_id) {
                        // Logic omitted for brevity, keeping strict ID check for now
                    }

                    // EXECUTE PROPER UPDATE ON TARGET VARIANT
                    if (targetVariant) {
                        const bStocks = targetVariant.branch_stocks;
                        let currentStock = 0;
                        if (bStocks instanceof Map) {
                            currentStock = bStocks.get(branchId) || 0;
                        } else {
                            currentStock = (bStocks as any)[branchId] || 0;
                        }

                        const modifier = document_type === 'credit_note' ? 1 : -1;
                        if (bStocks instanceof Map) {
                            bStocks.set(branchId, currentStock + (item.quantity * modifier));
                        } else {
                            (bStocks as any)[branchId] = currentStock + (item.quantity * modifier);
                        }

                        targetVariant.stock = (targetVariant.stock || 0) + (item.quantity * modifier);
                        stockUpdated = true;
                        product.markModified('variants');

                    } else if (!item.variant_id) {
                        // LEGACY FALLBACK (Only if no variant_id sent)
                        // Keeping legacy loop behavior if absolutely necessary, but preferably avoid it.
                        // For optimization, we skip the complex fallback loop unless needed.
                        // Assuming modern frontend sends variant_id.
                        // Re-implementing simplified fallback:
                        for (const variant of product.variants) {
                            const bStocks = variant.branch_stocks;
                            let currentStock = 0;
                            if (bStocks instanceof Map) currentStock = bStocks.get(branchId) || 0;
                            else currentStock = (bStocks as any)[branchId] || 0;

                            if (currentStock >= item.quantity) {
                                const modifier = document_type === 'credit_note' ? 1 : -1;
                                if (bStocks instanceof Map) bStocks.set(branchId, currentStock + (item.quantity * modifier));
                                else (bStocks as any)[branchId] = currentStock + (item.quantity * modifier);

                                variant.stock = (variant.stock || 0) + (item.quantity * modifier);
                                stockUpdated = true;
                                break;
                            }
                        }
                        if (stockUpdated) product.markModified('variants');
                    }
                }

                // B. BASE PRODUCT LOGIC
                if (!stockUpdated) {
                    // Credit Note = Return to Stock (+), Sale = Remove from Stock (-)
                    const modifier = document_type === 'credit_note' ? 1 : -1;
                    product.stock = (product.stock || 0) + (item.quantity * modifier);

                    if (branchId) {
                        if (!product.branch_stocks) {
                            product.branch_stocks = new Map();
                        }
                        if (product.branch_stocks instanceof Map) {
                            const current = product.branch_stocks.get(branchId) || 0;
                            product.branch_stocks.set(branchId, current + (item.quantity * modifier));
                        } else {
                            const current = (product.branch_stocks as any)[branchId] || 0;
                            (product.branch_stocks as any)[branchId] = current + (item.quantity * modifier);
                        }
                        product.markModified('branch_stocks');
                    }

                    // --- STOCK LOT CONSUMPTION ---
                    if (product.manages_lots && branchId && document_type !== 'credit_note') {
                        let remainingToConsume = item.quantity;
                        const vId = item.variant_id;

                        // Find lots ordered by expiration date (FIFO)
                        // FILTER: If variant, only lots for that variant. If not, only lots without variant.
                        const lotQuery: any = {
                            product_id: product._id,
                            branch_id: branchId,
                            stock: { $gt: 0 }
                        };

                        // We strictly respect the variant if provided
                        if (vId) lotQuery.variant_id = vId;
                        else lotQuery.variant_id = { $exists: false }; // Base product lots only

                        const lots = await StockLot.find(lotQuery)
                            .sort({ expiration_date: 1 })
                            .session(session);

                        for (const lot of lots) {
                            if (remainingToConsume <= 0) break;

                            const toTake = Math.min(lot.stock, remainingToConsume);
                            lot.stock -= toTake;
                            remainingToConsume -= toTake;
                            await lot.save({ session });
                        }

                        // Fallback: If still remaining and it was a variant sale, 
                        // should we consume from product "base" lots? 
                        // Usually no, to maintain strict traceability. 
                        // But if the user sells a variant and has lots but without variant_id set 
                        // (perhaps from a migration), we might want to consume them.
                        // For now, we stay STRICT.
                    }
                    // -----------------------------
                }
                await product.save({ session });
            }
        }

        // 3. Handle Current Account Payments
        for (const payment of finalPayments) {

            if (payment.method === 'ACCOUNT') {

                if (!customerId) throw new Error("Customer Required for Account Payment");

                const account = await CustomerAccount.findOne({ customer_id: customerId }).session(session);

                if (!account || !account.is_active) {
                    throw new Error("Cliente sin Cuenta Corriente habilitada.");
                }

                // Check Credit Limit (Before any updates)
                const isCreditNote = document_type === 'credit_note';

                if (!isCreditNote) {
                    const newBalance = account.balance + payment.amount;
                    if (account.credit_limit > 0 && newBalance > account.credit_limit) {
                        throw new Error(`El cliente superó su Límite en Cuenta Corriente. Límite: $${account.credit_limit.toLocaleString('es-AR')}, Saldo final: $${newBalance.toLocaleString('es-AR')}`);
                    }
                }

                // Create Movement
                const movType = isCreditNote ? 'CREDIT' : 'DEBIT'; // Credit Note = Refund (Credit)

                await AccountMovement.create([{
                    account_id: account._id,
                    type: movType,
                    amount: payment.amount,
                    description: `${isCreditNote ? 'Nota de Crédito' : 'Compra'} en Venta #${sale[0]._id}`,
                    performed_by: (req as any).user._id
                }], { session });

                // Update Balance
                // Credit Note = Decrease Debt (-), Sale = Increase Debt (+)
                if (isCreditNote) {
                    account.balance -= payment.amount;
                    if (account.balance <= 0) {
                        account.balance = 0;
                        account.last_debt_date = undefined;
                    }
                } else {
                    account.balance += payment.amount;
                    account.last_debt_date = new Date(); // Reset countdown on new POS purchase
                }

            } else {
                // Handle CASH / CREDIT_CARD / TRANSFER / etc.
                // No explicit CashMovement needed as Sales are aggregated directly in the Cash View.
            }
        }

        // --- CALCULATE COMMISSION ---
        let totalCommissionAmount = 0;
        const seller = await User.findById(sale[0].performed_by).session(session);
        
        if (seller) {
            // Pick primary payment method for rules (first one)
            const primaryPaymentMethod = finalPayments.length > 0 ? finalPayments[0].method : 'cash';

            for (const item of cart) {
                const product = productsMap.get(item.id);
                const itemPrice = item.price * item.quantity;
                const itemCost = (product?.cost || 0) * item.quantity;
                const itemNetProfit = itemPrice - itemCost;

                const itemCommission = await CommissionService.calculateCommission(
                    orgId.toString(),
                    seller._id.toString(),
                    {
                        roleId: seller.roleId?.toString(),
                        categoryId: product?.category_ids && product.category_ids.length > 0 ? product.category_ids[0].toString() : undefined,
                        paymentMethod: primaryPaymentMethod,
                        priceListId: item.priceListId // Assumes frontend sends this if applicable
                    },
                    itemPrice,
                    itemNetProfit
                );

                totalCommissionAmount += itemCommission;
            }
        }

        if (totalCommissionAmount > 0) {
            sale[0].commission_amount = parseFloat(totalCommissionAmount.toFixed(2));
            await sale[0].save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        // --- ASYNC INTEGRATION SYNC ---
        // Trigger sync for each product in the cart
        const prodIds = Array.from(new Set(cart.map((i: any) => i.id)));
        prodIds.forEach(pId => {
            IntegrationService.syncProductStock(pId as string, orgId.toString()).catch((err: any) => console.error('Error in syncProductStock:', err));
        });

        res.status(201).json({ success: true, sale: sale[0] });

    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error creating sale:", error);

        // Sanitize error message to avoid data leaks (like CastErrors containing documents)
        let userMessage = 'Error al procesar la venta';
        if (error.name === 'CastError') {
            userMessage = `Error de validación de datos: Valor inválido para el campo ${error.path}`;
        } else if (error.message && error.message.length < 500) {
            userMessage = error.message;
        }

        res.status(400).json({ message: userMessage });
    }
};

// @desc    Get all sales for an organization (Paginated)
// @route   GET /api/sales/:orgId
export const getSales = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const user = (req as any).user;

        // Security Check
        if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, orgId)) {
            return res.status(403).json({ message: 'Access Denied: Organization mismatch' });
        }

        const { from, to, page = 1, limit = 50 } = req.query; // Added pagination params
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 50;
        const skip = (pageNum - 1) * limitNum;

        const matchStage: any = { organization_id: new mongoose.Types.ObjectId(orgId) }; // Ensure ObjectId casting

        if (from || to) {
            matchStage.date = {};
            if (from) {
                // "from" string is YYYY-MM-DD. In Argentina (UTC-3), Start is 00:00 ART -> 03:00 UTC.
                const startDate = new Date(from as string);
                startDate.setUTCHours(3, 0, 0, 0);
                matchStage.date.$gte = startDate;
            }
            if (to) {
                // End is 23:59:59 ART -> Next Day 02:59:59 UTC.
                const endDate = new Date(to as string);
                endDate.setUTCHours(26, 59, 59, 999);
                matchStage.date.$lte = endDate;
            }
        } else {
            // OPTION: Enforce default filter if no date provided to avoid crashing?
            // For now, if no date is provided, we rely on PAGINATION to save us.
        }

        // Usamos aggregate para traer Clientes e Ítems de una sola vez
        console.log("GET SALES Query Params:", { from, to, orgId, page, limit });

        const sales = await Sale.aggregate([
            { $match: matchStage },
            { $sort: { date: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            // Lookup Customers
            {
                $lookup: {
                    from: 'customers', // Nombre de la colección en MongoDB
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
                        { $project: { name: 1, role: 1 } }
                    ],
                    as: 'performer'
                }
            },
            { $unwind: { path: '$performer', preserveNullAndEmptyArrays: true } },
            // Lookup Items
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
            }
        ]);

        const totalDocs = await Sale.countDocuments(matchStage);

        const safeSales = sales.map(s => ({
            ...s,
            // Check both snake_case and camelCase to handle potential DB inconsistencies
            discount_general: s.discount_general || s.discountGeneral || null,
            surcharge_general: s.surcharge_general || s.surchargeGeneral || null,
            rounding_difference: s.rounding_difference ?? s.roundingDifference ?? 0,
            manual_tax_added: s.manual_tax_added
        }));

        res.set('Cache-Control', 'no-store');
        res.json({
            data: safeSales,
            meta: {
                total: totalDocs,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalDocs / limitNum)
            }
        });
    } catch (error) {
        console.error("Error getting sales:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Cancel a sale
// @route   POST /api/sales/:id/cancel
export const cancelSale = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const user = (req as any).user;
        // const { orgId } = req.body; // Remove reliance on body

        const sale = await Sale.findById(id).session(session);
        if (!sale) throw new Error("Sale not found");

        // Security Check
        if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, sale.organization_id)) {
            throw new Error("Unauthorized: Sale does not belong to your organization");
        }
        if (sale.status === 'cancelled') throw new Error("Already cancelled");

        // 1. Mark as cancelled
        sale.status = 'cancelled';
        await sale.save({ session });

        // 2. Revert Stock
        const isCreditNote = sale.document_type === 'credit_note';
        const stockModifier = isCreditNote ? -1 : 1; // Credit Note: Remove from stock (-), Sale: Return to stock (+)

        // Need session ID to know which branch to revert to? 
        // We can look up the original sale's session -> register -> branch.
        let branchId = null;
        if (sale.session_id) {
            const sessionObj = await CashSession.findById(sale.session_id).populate({
                path: 'cashRegister',
                populate: { path: 'branch_id' }
            });
            branchId = (sessionObj?.cashRegister as any)?.branch_id?._id?.toString() || (sessionObj?.cashRegister as any)?.branch_id?.toString();
        }

        const items = await SaleItem.find({ sale_id: id }).session(session);
        for (const item of items) {
            const product = await Product.findById(item.product_id).session(session);
            if (product) {
                // Check if item has variant_id
                if (product.variants && product.variants.length > 0 && item.variant_id) {
                    const variant = product.variants.find(v => (v as any)._id.toString() === item.variant_id);
                    if (variant && branchId) {
                        // Update Variant Stock
                        const bStocks = variant.branch_stocks;
                        let current = 0;
                        if (bStocks instanceof Map) current = bStocks.get(branchId) || 0;
                        else current = (bStocks as any)[branchId] || 0;

                        if (bStocks instanceof Map) bStocks.set(branchId, current + (item.quantity * stockModifier));
                        else (bStocks as any)[branchId] = current + (item.quantity * stockModifier);

                        variant.stock = (variant.stock || 0) + (item.quantity * stockModifier);
                        product.markModified('variants');
                    }
                } else {
                    // Default Base Stock Revert (or if legacy item without variant_id)
                    // If it was a variant product but legacy item didn't have ID, we might revert to base stock by mistake or first variant?
                    // Safer to revert to base stock if no variant info.
                    if (branchId) {
                        if (!product.branch_stocks) product.branch_stocks = new Map();

                        let current = 0;
                        if (product.branch_stocks instanceof Map) current = product.branch_stocks.get(branchId) || 0;
                        else current = (product.branch_stocks as any)[branchId] || 0;

                        if (product.branch_stocks instanceof Map) product.branch_stocks.set(branchId, current + (item.quantity * stockModifier));
                        else (product.branch_stocks as any)[branchId] = current + (item.quantity * stockModifier);

                        product.markModified('branch_stocks');
                    }
                    product.stock = (product.stock || 0) + (item.quantity * stockModifier);
                }
                await product.save({ session });
            }
        }

        // 3. Revert Account Payments (if any)
        if (sale.payments && sale.payments.length > 0) {
            for (const payment of sale.payments) {
                if (payment.method === 'ACCOUNT' && sale.customer_id) {
                    const account = await CustomerAccount.findOne({ customer_id: sale.customer_id }).session(session);

                    if (account) {
                        // Soft Delete Logic: Find original movements and cancel them
                        const movements = await AccountMovement.find({
                            account_id: account._id,
                            description: { $regex: sale._id.toString() }, // Ensure we match string ID
                            status: { $ne: 'cancelled' } // Only find valid ones
                        }).session(session);

                        for (const mov of movements) {
                            // Update Status
                            mov.status = 'cancelled';
                            await mov.save({ session });

                            // Revert Balance based on original movement type
                            // If original was DEBIT (Purchase) -> It increased Debt -> Revert: Decrease Debt (- amount)
                            // If original was CREDIT (Refund/Note) -> It decreased Debt -> Revert: Increase Debt (+ amount)
                            if (mov.type === 'DEBIT') {
                                account.balance -= mov.amount;
                            } else {
                                account.balance += mov.amount;
                            }
                        }

                        if (account.balance < 0) account.balance = 0; // Safety check? Maybe allow negative if it was overpaid?
                        // Ideally balance should be correct math. 

                        await account.save({ session });
                    }
                }
            }
        }

        await session.commitTransaction();
        session.endSession();

        // --- ASYNC INTEGRATION SYNC ---
        // Trigger sync for each product in the sale
        items.forEach(item => {
            IntegrationService.syncProductStock(item.product_id.toString(), sale.organization_id.toString()).catch((err: any) => console.error('Error in syncProductStock:', err));
        });

        res.json({ success: true, message: "Sale cancelled" });

    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error cancelling sale:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get sale by ID
// @route   GET /api/sales/detail/:id
export const getSaleById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const sales = await Sale.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'performed_by',
                    foreignField: '_id',
                    pipeline: [
                        { $project: { name: 1, role: 1 } }
                    ],
                    as: 'performer'
                }
            },
            { $unwind: { path: '$performer', preserveNullAndEmptyArrays: true } },
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
            }
        ]);

        if (!sales || sales.length === 0) return res.status(404).json({ message: 'Sale not found' });

        // Ensure data consistency
        const sale = sales[0];
        res.json({
            ...sale,
            discount_general: sale.discount_general,
            rounding_difference: sale.rounding_difference,
            invoice_letter: sale.invoice_letter,
            fiscal_data: sale.fiscal_data
        });
    } catch (error) {
        console.error("Error fetching sale:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get commissions for a specific user
// @route   GET /api/sales/commissions/:userId
export const getUserCommissions = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const orgId = (req as any).user.organization;

        const sales = await Sale.find({
            organization_id: new mongoose.Types.ObjectId(orgId),
            performed_by: new mongoose.Types.ObjectId(userId),
            commission_amount: { $gt: 0 },
            status: 'completed'
        })
        .sort({ date: -1 })
        .populate('customer_id', 'name email');

        res.json(sales);
    } catch (error) {
        console.error("Error fetching commissions:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

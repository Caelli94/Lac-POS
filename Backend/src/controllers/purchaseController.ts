import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Purchase } from '../models/Purchase';
import { PurchaseItem } from '../models/PurchaseItem';
import { Product } from '../models/Product';
import { Supplier } from '../models/Supplier';
import { Branch } from '../models/Branch';
import { StockLot } from '../models/StockLot';

// @desc    Get all purchases for an organization
// @route   GET /api/purchases/:orgId
export const getPurchases = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const purchasesRaw = await Purchase.find({ organization_id: orgId })
            .sort({ date: -1 })
            .lean();

        const purchases = await Promise.all(purchasesRaw.map(async (p: any) => {
            // Populate Supplier manually (or simple lookup for name)
            const supplier = p.supplier_id ? await Supplier.findById(p.supplier_id).select('name').lean() : null;

            // Populate Branch manually
            const branch = p.branch_id ? await Branch.findById(p.branch_id).select('name').lean() : null;

            // Populate Performed By manually
            const userModel = mongoose.model('User');
            const performer = p.performed_by ? await userModel.findById(p.performed_by).select('name').lean() : null;

            // Populate Items for this purchase
            const itemsRaw = await PurchaseItem.find({ purchase_id: p._id }).lean();

            // Enrich items with product names (if needed by modal)
            const items = await Promise.all(itemsRaw.map(async (item: any) => {
                const product = await Product.findById(item.product_id).select('name sku').lean();
                return {
                    ...item,
                    id: item._id.toString(),
                    product_name: product?.name || 'Producto Desconocido',
                    product_sku: product?.sku
                };
            }));

            return {
                ...p,
                id: p._id.toString(),
                created_at: p.created_at || p.date, // Garantizar que haya una fecha válida
                suppliers: supplier ? { name: supplier.name } : null, // Match frontend expectation p.suppliers.name
                branches: branch ? { name: branch.name } : null,
                performer: performer ? { name: (performer as any).name, role: (performer as any).role } : null,
                items: items
            };
        }));

        res.json(purchases);
    } catch (error) {
        console.error("Error in getPurchases:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new purchase
// @route   POST /api/purchases
export const createPurchase = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { organization_id, supplier_id, branch_id, total_amount, items, update_timestamp = true } = req.body;

        // 1. Create Purchase
        const purchase = await Purchase.create([{
            organization_id,
            supplier_id: supplier_id || null,
            branch_id: branch_id || null,
            total_amount,
            performed_by: (req as any).user._id
        }], { session });

        const purchaseId = purchase[0]._id;

        // 2. Process Items
        console.log(`[PURCHASE] Processing ${items.length} items for Purchase ${purchaseId}`);
        for (const item of items) {
            console.log(`[PURCHASE] Item: ${item.product_id} | Variant: ${item.variant_id || 'N/A'} | Qty: ${item.quantity} | Cost: ${item.cost}`);

            // Create Purchase Item
            await PurchaseItem.create([{
                purchase_id: purchaseId,
                product_id: item.product_id,
                variant_id: item.variant_id || null,
                quantity: item.quantity,
                cost: item.cost
            }], { session });

            // Update Product Stock and Cost
            const product = await Product.findOne({
                _id: new mongoose.Types.ObjectId(item.product_id),
                organization_id: new mongoose.Types.ObjectId(organization_id)
            }).session(session);

            if (product) {
                const bId = branch_id ? branch_id.toString() : null;
                const newCost = item.cost;
                const oldCost = product.cost || 0;

                // CASO A: Es una VARIANTE específica
                if (item.variant_id && product.variants && product.variants.length > 0) {
                    const variantIndex = product.variants.findIndex((v: any) => v._id.toString() === item.variant_id);
                    if (variantIndex !== -1) {
                        const variant = product.variants[variantIndex];
                        console.log(`[PURCHASE] Updating variant ${variant.color} ${variant.size}`);

                        // 1. Stock de Variante
                        variant.stock = (variant.stock || 0) + item.quantity;

                        // 2. Branch Stock de Variante
                        if (bId) {
                            if (!variant.branch_stocks) variant.branch_stocks = new Map();
                            const currentVBranchStock = variant.branch_stocks.get(bId) || 0;
                            variant.branch_stocks.set(bId, currentVBranchStock + item.quantity);
                            // IMPORTANTE: Mongoose necesita saber que el Map cambió
                            product.markModified(`variants.${variantIndex}.branch_stocks`);
                        }

                        // 3. Stock Global del Producto (suma total)
                        product.stock = (product.stock || 0) + item.quantity;

                        // 4. Sincronizar Costo y Precios
                        product.cost = newCost;
                        product.markModified('variants'); // Aseguramos que el array de variants se guarde
                    }
                }
                // CASO B: Es el PRODUCTO base (sin variante)
                else {
                    product.stock = (product.stock || 0) + item.quantity;
                    if (bId) {
                        if (!product.branch_stocks) product.branch_stocks = new Map();
                        const currentBranchStock = product.branch_stocks.get(bId) || 0;
                        product.branch_stocks.set(bId, currentBranchStock + item.quantity);
                    }
                    product.cost = newCost;
                }

                // RECALCULAR PRECIOS (Común para ambos casos si el costo cambió)
                if (newCost !== oldCost && product.pricing && product.pricing.length > 0) {
                    product.pricing = product.pricing.map((p: any) => {
                        if (p.utilityType === 'percentage' && p.utilityValue) {
                            p.price = newCost * (1 + p.utilityValue / 100);
                        }
                        p.cost = newCost;
                        return p;
                    });
                    if (oldCost > 0 && product.price) {
                        product.price = product.price * (newCost / oldCost);
                    }
                } else if (!product.price || product.price === 0) {
                    product.price = newCost;
                }

                await product.save({ session, timestamps: update_timestamp });
                console.log(`[PURCHASE] Product ${product.name} saved successfully.`);

                // 3. LOT MANAGEMENT
                if (product.manages_lots && item.lot_number && item.expiration_date) {
                    console.log(`[PURCHASE] Registering Lot: ${item.lot_number} for Product: ${product.name}`);
                    await StockLot.create([{
                        organization_id,
                        product_id: product._id,
                        variant_id: item.variant_id || null,
                        branch_id: branch_id || null,
                        lot_number: item.lot_number,
                        expiration_date: new Date(item.expiration_date),
                        stock: item.quantity,
                        initial_stock: item.quantity
                    }], { session });
                }
            } else {
                console.error(`[PURCHASE] Product NOT FOUND: ${item.product_id}`);
            }
        }

        // 3. Update Supplier Account (Create Debt / Movement)
        if (supplier_id) {
            // Import Models internally if needed or assume top-level imports available (added below)
            const { SupplierAccount } = require('../models/SupplierAccount');
            const { SupplierAccountMovement } = require('../models/SupplierAccountMovement');

            // Find or Create Account
            let account = await SupplierAccount.findOne({ supplier_id: supplier_id }).session(session);
            if (!account) {
                // Lazy creation fail-safe
                account = await SupplierAccount.create([{
                    organization_id,
                    supplier_id,
                    is_active: true,
                    balance: 0
                }], { session });
                account = account[0];
            }

            // INVOICE LOGIC:
            // When we buy, we generate DEBT (Positive Balance).
            // Unless it was paid immediately? 
            // The Frontend "Comparison" shows: 
            // - `payment_method` in Purchase model (missing in destructuring above).

            // Assume Purchase = Debt Increase (Factura)
            // If user paid cash, they should register a separate Payment or we handle it here if payment_method provided.
            // For simplicity and matching "Eye" button requirement: Reference the Purchase.

            // Update Balance
            account.balance += total_amount;
            account.last_debt_date = new Date();
            await account.save({ session });

            // Create Movement
            await SupplierAccountMovement.create([{
                account_id: account._id,
                type: 'DEBIT', // Debt Increase
                amount: total_amount,
                description: `Compra #${purchaseId} - ${items.length} items`,
                performed_by: (req as any).user._id
            }], { session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ success: true, purchase: purchase[0] });

    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error creating purchase:", error);
        res.status(500).json({ message: error.message });
    }
};

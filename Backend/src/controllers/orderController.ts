import { Request, Response } from 'express';
import { CustomerOrder } from '../models/CustomerOrder';
import mongoose from 'mongoose';
import { Organization } from '../models/Organization';
import { CashMovement, CashSession, CashRegister } from '../models/Cash';

// @desc    Get all orders for an organization
// @route   GET /api/orders/:orgId
export const getOrders = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const { status } = req.query;

        const user = (req as any).user;
        const userOrgId = user.organization?._id?.toString() || user.organization?.toString() || '';

        // SECURITY: Strict Tenant Isolation (Exempt Super Admin)
        const isInternalMember = userOrgId && (userOrgId === orgId.toString());
        const isSystemAdmin = user.role === 'superadmin' || user.role === 'admin';

        if (!isInternalMember && !isSystemAdmin) {
            return res.status(403).json({ message: 'Acceso denegado.' });
        }

        const query: any = mongoose.isValidObjectId(orgId)
            ? { organization_id: { $in: [orgId, new mongoose.Types.ObjectId(orgId)] } }
            : { organization_id: orgId };

        query.deleted = { $ne: true };

        if (status && status !== 'ALL') {
            query.status = status;
        }

        const orders = await CustomerOrder.find(query)
            .populate('customer', 'name phone email')
            .populate('product', 'name sku')
            .populate('performed_by', 'name role')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new order
// @route   POST /api/orders
export const createOrder = async (req: Request, res: Response) => {
    try {
        const { organization_id, customer_id, customer_name, payment_method, product_name, product_id, quantity, details, deposit_amount, expected_date } = req.body;

        let cash_movement_id = undefined;

        // If there's a deposit, try to create a CashMovement
        if (deposit_amount > 0) {
            // Find active session for this organization (assuming one open session per org/branch)
            // Ideally we'd pass cashRegisterId from frontend, but we can try to find one open register.
            const session = await CashSession.findOne({
                organization: organization_id,
                status: 'open'
            });

            if (session) {
                const movement = await CashMovement.create({
                    cashRegister: session.cashRegister,
                    session: session._id,
                    type: 'PAYMENT_RECEIVED',
                    amount: deposit_amount,
                    description: `Seña por encargue: ${product_name}`,
                    paymentMethod: payment_method || 'Efectivo',
                    referenceId: undefined, // Will be updated after order creation or left as is
                    createdBy: (req as any).user?._id,
                    customer: customer_id
                });
                cash_movement_id = movement._id;

                // Update Register Balance if Cash
                if (payment_method === 'cash' || payment_method === 'Efectivo') {
                    await CashRegister.findByIdAndUpdate(session.cashRegister, {
                        $inc: { closingBalance: deposit_amount }
                    });
                }
            } else {
                throw new Error("Debe abrir la caja para registrar una seña.");
            }
        }

        const order = await CustomerOrder.create({
            organization_id,
            customer_id,
            customer_name,
            payment_method,
            cash_movement_id,
            product_name,
            product_id,
            quantity: quantity || 1,
            details,
            deposit_amount: deposit_amount || 0,
            expected_date,
            status: 'PENDING',
            performed_by: (req as any).user?._id
        });

        // Update movement reference if it exists
        if (cash_movement_id) {
            await CashMovement.findByIdAndUpdate(cash_movement_id, { referenceId: order._id });
        }

        res.status(201).json(order);
    } catch (error: any) {
        console.error("Error creating order:", error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update an order
// @route   PUT /api/orders/:id
export const updateOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, details, deposit_amount, expected_date, product_name, quantity, customer_id, customer_name, payment_method } = req.body;

        const oldOrder = await CustomerOrder.findById(id);
        if (!oldOrder) {
            return res.status(404).json({ message: 'Encargue no encontrado' });
        }

        if (oldOrder.status === 'CANCELLED') {
            return res.status(400).json({ message: 'No se puede modificar un encargue cancelado.' });
        }

        let cash_movement_id = oldOrder.cash_movement_id;

        // If deposit amount changed and there was no previous movement, or it increased
        if (deposit_amount > (oldOrder.deposit_amount || 0)) {
            const addedAmount = deposit_amount - (oldOrder.deposit_amount || 0);

            const session = await CashSession.findOne({
                organization: oldOrder.organization_id,
                status: 'open'
            });

            if (session) {
                const movement = await CashMovement.create({
                    cashRegister: session.cashRegister,
                    session: session._id,
                    type: 'PAYMENT_RECEIVED',
                    amount: addedAmount,
                    description: `Adelanto extra por encargue: ${product_name || oldOrder.product_name}`,
                    paymentMethod: payment_method || oldOrder.payment_method || 'Efectivo',
                    referenceId: oldOrder._id,
                    createdBy: (req as any).user?._id,
                    customer: customer_id || oldOrder.customer_id
                });

                // If there was no movement before, keep this one. 
                // Note: This logic is simple, ideally we track all movements linked to an order.
                if (!cash_movement_id) cash_movement_id = movement._id;

                // Update Register Balance if Cash
                if ((payment_method || oldOrder.payment_method) === 'cash' || (payment_method || oldOrder.payment_method) === 'Efectivo') {
                    await CashRegister.findByIdAndUpdate(session.cashRegister, {
                        $inc: { closingBalance: addedAmount }
                    });
                }
            } else {
                throw new Error("Debe abrir la caja para registrar un adelanto extra.");
            }
        }

        const order = await CustomerOrder.findByIdAndUpdate(id, {
            status,
            details,
            deposit_amount,
            expected_date,
            product_name,
            quantity,
            customer_id,
            customer_name,
            payment_method,
            cash_movement_id
        }, { new: true });

        res.json(order);
    } catch (error: any) {
        console.error("Error updating order:", error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete (Soft) an order
// @route   DELETE /api/orders/:id
export const deleteOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await CustomerOrder.findByIdAndUpdate(id, { deleted: true, deletedAt: new Date() });
        res.json({ message: 'Pedido eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

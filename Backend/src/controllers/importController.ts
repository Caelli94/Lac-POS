import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import { Category } from '../models/Category';
import { CustomerAccount } from '../models/CustomerAccount';
import { SupplierAccount } from '../models/SupplierAccount';
import { StockLot } from '../models/StockLot';
import { Organization } from '../models/Organization';
import mongoose from 'mongoose';

const generateNextCode = async (model: any, organization_id: string, fieldName: string = 'sku'): Promise<string> => {
    const orgIdQuery = { $in: [new mongoose.Types.ObjectId(organization_id), String(organization_id)] };
    const lastRecord = await model.findOne({ organization_id: orgIdQuery, [fieldName]: { $regex: /^\d+$/ } })
        .sort({ [fieldName]: -1 })
        .select(fieldName)
        .lean();

    let nextNumber = 1;
    if (lastRecord && (lastRecord as any)[fieldName]) {
        const lastNumber = parseInt((lastRecord as any)[fieldName], 10);
        if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
    }

    let isFree = false;
    while (!isFree) {
        const exists = await model.findOne({ organization_id: orgIdQuery, [fieldName]: nextNumber.toString() });
        if (!exists) isFree = true;
        else nextNumber++;
    }
    return nextNumber.toString();
};

const cleanId = (id: any) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
const cleanName = (name: any) => String(name || '').replace(/\s+/g, ' ').toLowerCase().trim();

export const processImport = async (req: Request, res: Response) => {
    try {
        const { module } = req.params;
        const { organization_id, rows, options } = req.body;

        const summary = { created: 0, updated: 0, skipped: 0 };
        const logs: any[] = [];

        const org = await Organization.findById(organization_id);
        if (!org) return res.status(404).json({ success: false, message: 'Organización no encontrada' });

        const getSafeLimit = (p: string, def: number) => {
            const v1 = org.get(`settings.${p}`);
            const v2 = org.get(p);
            return (v1 !== undefined && v1 !== null) ? Number(v1) : ((v2 !== undefined && v2 !== null) ? Number(v2) : def);
        };

        const limits = {
            inventory: getSafeLimit('products_limit', 100),
            customers: getSafeLimit('customers_limit', 50),
            suppliers: getSafeLimit('suppliers_limit', 20)
        };

        // Robust ID Filter: Catch everything (ObjectId, original string, normalized string)
        const robustOrgIdFilter = {
            $or: [
                { organization_id: org._id },
                { organization_id: String(org._id) },
                { organization_id: organization_id }
            ]
        };
        const notDeletedQuery = { deleted: { $ne: true } };

        if (module === 'inventory') {
            const categories = await Category.find({ ...robustOrgIdFilter });
            const catMap = new Map(categories.map(c => [cleanName(c.name), c._id]));
            let currentCount = await Product.countDocuments({ ...robustOrgIdFilter, ...notDeletedQuery });
            const operations = [];

            for (const row of rows) {
                let sku = row.sku ? String(row.sku).trim() : undefined;
                let barcode = row.barcode ? String(row.barcode).trim() : undefined;

                if (!sku && !barcode && !row._existingId) {
                    if (options?.generateCodes) sku = await generateNextCode(Product, organization_id, 'sku');
                    else {
                        summary.skipped++;
                        logs.push({ name: row.name || 'Sin Nombre', code: 'S/D', id: 'S/D', status: 'skipped', reason: 'Falta SKU/Barcode' });
                        continue;
                    }
                }

                // ABSOLUTE TRUST: If frontend sent an ID, use it.
                const isUpdate = !!row._existingId;

                if (!isUpdate) {
                    if (limits.inventory !== -1 && currentCount >= limits.inventory) {
                        summary.skipped++;
                        logs.push({ name: row.name || 'Sin Nombre', code: sku || barcode || 'S/D', id: sku || barcode || 'S/D', status: 'skipped', reason: `Límite excedido (Hay: ${currentCount}, Máximo: ${limits.inventory})` });
                        continue;
                    }
                    currentCount++;
                    summary.created++;
                } else summary.updated++;

                logs.push({ name: row.name, code: sku || barcode, id: sku || barcode, status: isUpdate ? 'updated' : 'created' });

                const updateFields: any = {};
                if (row.name) updateFields.name = String(row.name).trim();
                if (row.description) updateFields.description = String(row.description).trim();
                // ... (rest of field logic remains same)
                if (row.cost !== undefined) updateFields.cost = Number(row.cost);
                if (row.price !== undefined) updateFields.price = Number(row.price);
                if (row.min_stock !== undefined) updateFields.min_stock = Number(row.min_stock);
                if (row.tax_rate !== undefined) updateFields.tax_rate = Number(row.tax_rate);
                if (row.image_url) updateFields.image_url = String(row.image_url).trim();
                if (row.manages_lots !== undefined) updateFields.manages_lots = row.manages_lots === true || row.manages_lots === 'true';
                if (row.stock !== undefined) updateFields.stock = Number(row.stock);

                const pricing: any[] = [];
                const branchStocks: Record<string, number> = {};
                Object.keys(row).forEach(key => {
                    if (key.startsWith('price_list_')) {
                        const val = Number(row[key]);
                        if (!isNaN(val)) pricing.push({ name: key.replace('price_list_', '').replace(/_/g, ' '), price: val, cost: updateFields.cost || 0 });
                    }
                    if (key.startsWith('stock_branch_')) {
                        const val = Number(row[key]);
                        if (!isNaN(val)) branchStocks[key.replace('stock_branch_', '')] = val;
                    }
                });
                if (pricing.length > 0) updateFields.pricing = pricing;
                if (Object.keys(branchStocks).length > 0) updateFields.branch_stocks = branchStocks;

                if (row.category) {
                    const catName = cleanName(row.category);
                    if (catMap.has(catName)) updateFields.category_ids = [catMap.get(catName)];
                }

                if (options?.supplierId) updateFields.supplier_id = options.supplierId;
                if (row.supplier_product_code) updateFields.supplier_product_code = String(row.supplier_product_code).trim();

                if (isUpdate) {
                    const castedId = new mongoose.Types.ObjectId(row._existingId);
                    operations.push({
                        updateOne: {
                            filter: { _id: castedId },
                            update: { $set: updateFields }
                        }
                    });
                } else {
                    operations.push({
                        updateOne: {
                            filter: { ...robustOrgIdFilter, sku: sku },
                            update: {
                                $set: updateFields,
                                $setOnInsert: { organization_id: org._id, sku: sku || `AUTO-${Date.now()}`, is_visible: true, deleted: false }
                            },
                            upsert: true
                        }
                    });
                }
            }
            if (operations.length > 0) await Product.bulkWrite(operations);
        }

        else if (module === 'customers') {
            let currentCount = await Customer.countDocuments({ ...robustOrgIdFilter, ...notDeletedQuery });
            for (const row of rows) {
                let docNumber = String(row.doc_number || row.tax_id || row.dni || '').trim();

                if (!docNumber && !row.name && !row.code && !row._existingId) {
                    summary.skipped++;
                    logs.push({ name: 'Sin Datos', code: 'S/D', id: 'S/D', status: 'skipped', reason: 'Faltan campos mínimos' });
                    continue;
                }

                // ABSOLUTE TRUST: If frontend sent an ID, use it.
                const isUpdate = !!row._existingId;

                if (!isUpdate) {
                    if (limits.customers !== -1 && currentCount >= limits.customers) {
                        summary.skipped++;
                        logs.push({ name: row.name || 'Sin Nombre', code: docNumber || 'S/D', id: docNumber || 'S/D', status: 'skipped', reason: `Límite excedido (Hay: ${currentCount}, Máximo: ${limits.customers})` });
                        continue;
                    }
                    if (options?.generateCodes && !docNumber) docNumber = await generateNextCode(Customer, organization_id, 'doc_number');
                    currentCount++;
                    summary.created++;
                } else summary.updated++;

                logs.push({ name: row.name, code: docNumber, id: docNumber, status: isUpdate ? 'updated' : 'created' });

                const ccValue = row.current_account_active || row.is_active_account;
                const updateFields: any = {
                    name: row.name,
                    email: row.email,
                    phone: row.phone,
                    address: row.address,
                    city: row.city,
                    province: row.province,
                    doc_type: row.doc_type || 'DNI',
                    doc_number: String(docNumber).trim(),
                    code: String(row.code || '').trim(),
                    surcharge_rate: Number(row.surcharge_rate || 0),
                    current_account_active: ccValue === true || ccValue === 'true' || String(ccValue).toLowerCase() === 'si'
                };
                Object.keys(updateFields).forEach(k => updateFields[k] === undefined && delete updateFields[k]);

                let customer;
                if (isUpdate) {
                    const castedId = new mongoose.Types.ObjectId(row._existingId);
                    customer = await Customer.findOneAndUpdate(
                        { _id: castedId },
                        { $set: updateFields },
                        { new: true, lean: true }
                    );
                } else {
                    customer = await Customer.create({
                        ...updateFields,
                        organization_id: org._id,
                        deleted: false
                    });
                    customer = customer.toObject();
                }

                if (row.balance !== undefined && customer) {
                    await CustomerAccount.findOneAndUpdate(
                        { customer_id: customer._id },
                        {
                            $set: { balance: Number(row.balance), is_active: true },
                            $setOnInsert: { organization_id: org._id, customer_id: customer._id }
                        },
                        { upsert: true, new: true }
                    );
                }
            }
        }

        else if (module === 'suppliers') {
            let currentCount = await Supplier.countDocuments({ ...robustOrgIdFilter, ...notDeletedQuery });
            for (const row of rows) {
                let taxId = row.tax_id || row.cuit;

                if (!taxId && !row.name && !row.code && !row._existingId) {
                    summary.skipped++;
                    logs.push({ name: 'Sin Datos', code: 'S/D', id: 'S/D', status: 'skipped', reason: 'Faltan campos mínimos' });
                    continue;
                }

                // DOUBLE CHECK: Even if frontend says it's an update, verify it exists.
                let isUpdate = false;
                if (row._existingId) {
                    const actualSupplier = await Supplier.findOne({ _id: row._existingId, organization_id: org._id, deleted: false });
                    if (actualSupplier) isUpdate = true;
                }

                if (!isUpdate) {
                    const currentCount = await Supplier.countDocuments({ ...robustOrgIdFilter, ...notDeletedQuery });
                    if (limits.suppliers !== -1 && currentCount >= limits.suppliers) {
                        summary.skipped++;
                        logs.push({ name: row.name || 'Sin Nombre', code: taxId || 'S/D', id: taxId || 'S/D', status: 'skipped', reason: `Límite excedido (Máximo: ${limits.suppliers})` });
                        continue;
                    }
                    if (options?.generateCodes && !taxId) taxId = await generateNextCode(Supplier, organization_id, 'tax_id');
                    summary.created++;
                } else summary.updated++;

                logs.push({ name: row.name, code: taxId, id: taxId, status: isUpdate ? 'updated' : 'created' });

                const ccValue = row.has_active_account || row.current_account_active || row.is_active_account;
                const updateFields: any = {
                    name: row.name,
                    email: row.email,
                    phone: row.phone,
                    contact_name: row.contact_name,
                    tax_id: taxId,
                    code: String(row.code || '').trim(),
                    has_active_account: ccValue === true || ccValue === 'true' || String(ccValue).toLowerCase() === 'si'
                };
                if (row.address || row.city || row.province) {
                    updateFields.addresses = [{ street: row.address || '', city: row.city || '', province: row.province || '', notes: 'Importado' }];
                }
                Object.keys(updateFields).forEach(k => updateFields[k] === undefined && delete updateFields[k]);

                let supplier;
                if (isUpdate) {
                    const castedId = new mongoose.Types.ObjectId(row._existingId);
                    supplier = await Supplier.findOneAndUpdate(
                        { _id: castedId },
                        { $set: updateFields },
                        { new: true, lean: true }
                    );
                } else {
                    supplier = await Supplier.create({
                        ...updateFields,
                        organization_id: org._id,
                        deleted: false
                    });
                    supplier = supplier.toObject();
                }

                if (row.balance !== undefined && supplier) {
                    await SupplierAccount.findOneAndUpdate(
                        { supplier_id: supplier._id },
                        {
                            $set: { balance: Number(row.balance), is_active: updateFields.has_active_account === true },
                            $setOnInsert: { organization_id: org._id, supplier_id: supplier._id }
                        },
                        { upsert: true, new: true }
                    );
                }
            }
        }

        return res.json({ success: true, processed: summary.created + summary.updated, summary, logs, message: `Importación finalizada.` });

    } catch (error: any) {
        console.error("Import Controller Error:", error);
        return res.status(500).json({ success: false, message: error.message || 'Server Internal Error' });
    }
};

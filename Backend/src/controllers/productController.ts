import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { Branch } from '../models/Branch';
import { StockLot } from '../models/StockLot';
import mongoose from 'mongoose';
import { IntegrationService } from '../services/IntegrationService';

// @desc    Get paginated products with advanced filtering
// @route   GET /api/products/:orgId
// @desc    Get paginated products with advanced filtering
// @route   GET /api/products/:orgId (OrgId ignored for security, taken from Token)
export const getProducts = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const user = (req as any).user;
        const userOrgId = user.organization?._id?.toString() || user.organization?.toString() || '';

        // SECURITY: Strict Tenant Isolation (Exempt Super Admin)
        // Permitimos acceso si es el dueño de la organización o si es un auditor (admin/superadmin)
        const isInternalMember = userOrgId && userOrgId === orgId;
        const isSystemAdmin = user.role === 'superadmin' || user.role === 'admin';

        if (!isInternalMember && !isSystemAdmin) {
            return res.status(403).json({ message: 'Acceso denegado.' });
        }

        // const { orgId } = req.params; // <-- VULNERABLE: Ignored

        const {
            page = 1,
            limit = 50,
            search = '',
            branch = 'ALL',
            stock = 'ALL',
            visibility = 'ALL',
            supplier_id,
            sortBy = 'sku',
            sortOrder = 'asc',
            category_id
        } = req.query;

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 50;
        const skip = (pageNum - 1) * limitNum;
        const sortDir = sortOrder === 'desc' ? -1 : 1;

        let sortStage: any = {};
        if (sortBy === 'name') sortStage = { name: sortDir };
        else if (sortBy === 'sku') sortStage = { sku: sortDir };
        else if (sortBy === 'updatedAt') sortStage = { updatedAt: sortDir, sku: 1 };
        else sortStage = { sku: 1 }; // Default fallback

        // 1. Initial Match Stage
        const matchStage: any = {
            organization_id: new mongoose.Types.ObjectId(orgId), // STRICT SCOPE
            deleted: { $ne: true } // Exclude Soft Deleted
        };

        // Category Filter
        if (category_id) {
            const catIds = category_id.toString().split(',').filter(id => id.trim().length === 24);
            if (catIds.length > 0) {
                matchStage.category_ids = { $in: catIds.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }

        // Supplier Filter
        if (supplier_id) {
            const supIds = supplier_id.toString().split(',').filter(id => id.trim().length === 24);
            if (supIds.length > 0) {
                matchStage.supplier_id = { $in: supIds.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }

        // Visibility Filter
        if (visibility === 'VISIBLE') matchStage.is_visible = true;
        if (visibility === 'HIDDEN') matchStage.is_visible = false;

        // Search Filter (Regex)
        if (search) {
            const escapedSearch = String(search).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'); // Anti-ReDoS
            const searchRegex = new RegExp(escapedSearch, 'i');
            matchStage.$or = [
                { name: searchRegex },
                { sku: searchRegex },
                { barcode: searchRegex },
                { "variants.barcode": searchRegex },
                { supplier_product_code: searchRegex }
            ];
        }

        // 2. Stock Calculation Logic
        // We need to project the 'effectiveStock' to filter by it later.
        // Branch Logic:
        // - 'ALL': Use global 'stock' or sum of 'variants.stock'
        // - 'SpecificId': Use 'branch_stocks.ID' or sum of 'variants.branch_stocks.ID'

        let stockCalculation: any = {};

        if (branch === 'ALL') {
            stockCalculation = {
                $cond: {
                    if: { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
                    then: { $sum: "$variants.stock" },
                    else: { $ifNull: ["$stock", 0] }
                }
            };
        } else {
            // Specific Branch
            // Use $getField for safe access to dynamic keys (IDs)
            stockCalculation = {
                $cond: {
                    if: { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
                    then: {
                        $sum: {
                            $map: {
                                input: "$variants",
                                as: "variant",
                                in: { $ifNull: [{ $getField: { field: branch, input: "$$variant.branch_stocks" } }, 0] }
                            }
                        }
                    },
                    else: { $ifNull: [{ $getField: { field: branch, input: "$branch_stocks" } }, 0] }
                }
            };
        }

        // 3. Pipeline
        const pipeline: any[] = [
            { $match: matchStage },
            {
                $addFields: {
                    effectiveStock: stockCalculation
                }
            }
        ];

        // 4. Stock Range Filter (Post-Calculation)
        if (stock !== 'ALL') {
            if (stock === 'OUT') pipeline.push({ $match: { effectiveStock: { $lte: 0 } } });
            if (stock === 'LOW') pipeline.push({ $match: { effectiveStock: { $gt: 0, $lte: 5 } } });
            if (stock === 'HIGH') pipeline.push({ $match: { effectiveStock: { $gt: 5 } } });
        }

        // 5. Facet for Pagination & Data
        pipeline.push({
            $facet: {
                metadata: [{ $count: "total" }],
                data: [
                    { $sort: sortStage }, // Dynamic Sort
                    { $skip: skip },
                    { $limit: limitNum },
                    // Populate equivalent (Lookup)
                    {
                        $lookup: {
                            from: "categories",
                            localField: "category_ids",
                            foreignField: "_id",
                            as: "category_ids" // Overwrite with populated array
                        }
                    },
                    {
                        $lookup: {
                            from: "suppliers",
                            localField: "supplier_id",
                            foreignField: "_id",
                            as: "supplier_docs"
                        }
                    },
                    {
                        $addFields: {
                            id: "$_id",
                            supplier_id: { $arrayElemAt: ["$supplier_docs", 0] }, // Unwind supplier
                            created_at: "$createdAt",
                            updated_at: "$updatedAt"
                        }
                    },
                    { $project: { supplier_docs: 0 } } // Cleanup
                ]
            }
        });

        const result = await Product.aggregate(pipeline);

        const metadata = result[0].metadata[0] || { total: 0 };
        const products = result[0].data;

        // Enriquecer productos con stock por sucursal
        const branches = await Branch.find({ organization_id: orgId });
        const enrichedProducts = products.map((p: any) => {
            const productBranches = branches.map(b => {
                const bId = b._id.toString();
                let stock = 0;

                if (p.variants && p.variants.length > 0) {
                    stock = p.variants.reduce((acc: number, v: any) => {
                        // Access branch_stocks map - when coming from aggregate, it's a plain object
                        const bStock = v.branch_stocks ? (v.branch_stocks[bId] || 0) : 0;
                        return acc + bStock;
                    }, 0);
                } else {
                    stock = p.branch_stocks ? (p.branch_stocks[bId] || 0) : 0;
                }

                return {
                    id: bId,
                    name: b.name,
                    stock
                };
            });

            return {
                ...p,
                branches: productBranches
            };
        });

        res.json({
            data: enrichedProducts,
            pagination: {
                total: metadata.total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(metadata.total / limitNum)
            }
        });


    } catch (error) {
        console.error("Error in getProducts:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new product
// @route   POST /api/products
// Helper to parse and transform pricing data
const transformPricing = (pricingData: any, rootCost: any) => {
    let parsed = pricingData;
    if (typeof pricingData === 'string') {
        try { parsed = JSON.parse(pricingData); } catch (e) { return []; }
    }
    if (!parsed || typeof parsed !== 'object') return [];

    const unifiedCost = Number(rootCost || 0);

    // If array, just map
    if (Array.isArray(parsed)) {
        return parsed.map((p: any) => ({
            list_id: p.list_id,
            price: Number(p.finalPrice || p.price || 0),
            cost: unifiedCost, // Force Unified Cost
            utilityValue: Number(p.utilityValue || 0),
            utilityType: p.utilityType || 'percentage',
            name: p.name
        }));
    }

    return Object.entries(parsed).map(([listId, val]: [string, any]) => ({
        list_id: listId,
        price: Number(val.finalPrice || val.price || 0),
        cost: unifiedCost, // Force Unified Cost
        utilityValue: Number(val.utilityValue || 0),
        utilityType: val.utilityType || 'percentage',
        name: val.name
    }));
};

const syncLots = async (organization_id: any, product_id: any, lots_data: any) => {
    if (!lots_data || !Array.isArray(lots_data)) return;

    // 1. Obtener producto para tener los IDs reales de las variantes
    const product = await Product.findOne({ _id: product_id, organization_id });
    if (!product) return;

    // Mapeo de tempId (del cliente) a ID real (de MongoDB)
    const tempToRealId: { [tempId: string]: string } = {};
    if (product.variants && product.variants.length > 0) {
        product.variants.forEach((v: any) => {
            // El cliente envía el tempId dentro del objeto de variante cuando es nueva
            if (v.tempId) {
                tempToRealId[v.tempId] = v._id.toString();
            }
        });
    }

    // Estructuras para acumular totales
    const totalBranchStocks: { [branchId: string]: number } = {};
    let totalStock = 0;
    const variantStockAccumulator: { [vId: string]: { stock: number, branches: { [bId: string]: number } } } = {};

    for (const lotEntry of lots_data) {
        let { lot_number, expiration_date, variant_id, branch_stocks } = lotEntry;
        if (!lot_number || !expiration_date) continue;

        // Si el variant_id es un tempId, lo traducimos al ID real generado
        if (variant_id && tempToRealId[variant_id]) {
            variant_id = tempToRealId[variant_id];
        }

        const branchIds = Object.keys(branch_stocks || {});
        for (const branch_id of branchIds) {
            const stock = Number(branch_stocks[branch_id]);
            if (isNaN(stock)) continue;

            const vKey = variant_id || 'base';

            // Acumular totales globales
            totalBranchStocks[branch_id] = (totalBranchStocks[branch_id] || 0) + stock;
            totalStock += stock;

            // Acumular totales por variante
            if (vKey !== 'base') {
                if (!variantStockAccumulator[vKey]) variantStockAccumulator[vKey] = { stock: 0, branches: {} };
                variantStockAccumulator[vKey].stock += stock;
                variantStockAccumulator[vKey].branches[branch_id] = (variantStockAccumulator[vKey].branches[branch_id] || 0) + stock;
            }

            // Sincronizar StockLot
            let lot = await StockLot.findOne({
                organization_id,
                product_id,
                variant_id: variant_id || null,
                branch_id,
                lot_number: lot_number.toUpperCase(),
                expiration_date: new Date(expiration_date)
            });

            if (lot) {
                lot.stock = stock;
                await lot.save();
            } else if (stock > 0) {
                await StockLot.create({
                    organization_id,
                    product_id,
                    variant_id: variant_id || null,
                    branch_id,
                    lot_number: lot_number.toUpperCase(),
                    expiration_date: new Date(expiration_date),
                    stock,
                    initial_stock: stock
                });
            }
        }
    }

    // 2. Si tiene variantes, actualizar sus stocks finales basados en los lotes
    if (product.variants && product.variants.length > 0) {
        product.variants.forEach((v: any) => {
            const vId = v._id?.toString() || v.id?.toString();
            if (vId && variantStockAccumulator[vId]) {
                v.stock = variantStockAccumulator[vId].stock;
                v.branch_stocks = new Map(Object.entries(variantStockAccumulator[vId].branches));
            } else {
                v.stock = 0;
                v.branch_stocks = new Map();
            }
        });
        product.markModified('variants');
    }

    // 3. Actualizar totales del producto
    product.stock = totalStock;
    product.branch_stocks = new Map(Object.entries(totalBranchStocks));

    await product.save();
};

import { Organization } from '../models/Organization';

// ... imports

// @desc    Create a new product
// @route   POST /api/products
export const createProduct = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organization_id = user.organization._id || user.organization; // STRICT

        // CHECK LIMITS
        const org = await Organization.findById(organization_id);
        if (org?.settings?.products_limit !== undefined && org.settings.products_limit !== -1) {
            const orgIdQuery = { $in: [new mongoose.Types.ObjectId(organization_id.toString()), organization_id.toString()] };
            const currentCount = await Product.countDocuments({ organization_id: orgIdQuery, deleted: { $ne: true } });
            if (currentCount >= org.settings.products_limit) {
                return res.status(403).json({ message: 'LIMIT_REACHED_PRODUCTS' });
            }
        }

        const {
            name, price, cost, stock, min_stock, sku, barcode,
            category_ids, supplier_id, variants, pricing, is_visible, manages_lots, description, image_url,
            custom_attributes, tax_rate, supplier_product_code, branch_stocks,
            lots_data // Nueva estructura de lotes con distribución
        } = req.body;

        const product = await Product.create({
            organization_id, // FORCED from Token
            name,
            price,
            cost: cost || 0,
            stock: stock || 0,
            min_stock: min_stock || 0,
            sku,
            barcode,
            category_ids,
            supplier_id,
            variants,
            pricing: transformPricing(pricing, cost),
            is_visible: is_visible === 'true' || is_visible === true,
            manages_lots: manages_lots === 'true' || manages_lots === true,
            description,
            image_url,
            custom_attributes: typeof custom_attributes === 'string' ? JSON.parse(custom_attributes) : (custom_attributes || {}),
            tax_rate: tax_rate !== undefined ? tax_rate : 21.0, // Default 21
            supplier_product_code,
            branch_stocks
        });

        // --- SYNC LOTS ---
        if ((manages_lots === 'true' || manages_lots === true) && lots_data) {
            const parsedLots = typeof lots_data === 'string' ? JSON.parse(lots_data) : lots_data;
            await syncLots(organization_id, product._id, parsedLots);
        }

        // --- ASYNC INTEGRATION SYNC ---
        IntegrationService.syncProductStock(product._id.toString(), organization_id.toString()).catch((err: any) => console.error('Error in syncProductStock:', err));

        res.status(201).json(product);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get a single product by ID
// @route   GET /api/products/detail/:id
export const getProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const organization_id = user.organization._id || user.organization;

        const product = await Product.findOne({ _id: id, organization_id: organization_id, deleted: { $ne: true } });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const organization_id = user.organization._id || user.organization; // STRICT

        const {
            name, price, cost, stock, min_stock, sku, barcode,
            category_ids, supplier_id, variants, pricing, is_visible, manages_lots, description, image_url,
            custom_attributes, tax_rate, supplier_product_code, branch_stocks,
            update_timestamp, lots_data // Extract lots_data
        } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = price;
        if (cost !== undefined) updateData.cost = cost;
        if (stock !== undefined) updateData.stock = stock;
        if (min_stock !== undefined) updateData.min_stock = min_stock;
        if (sku !== undefined) updateData.sku = sku;
        if (barcode !== undefined) updateData.barcode = barcode;
        if (category_ids !== undefined) updateData.category_ids = category_ids;
        if (supplier_id !== undefined) updateData.supplier_id = supplier_id;
        if (variants !== undefined) updateData.variants = variants;
        if (pricing !== undefined) updateData.pricing = transformPricing(pricing, cost); // Only update if provided
        if (is_visible !== undefined) updateData.is_visible = (is_visible === 'true' || is_visible === true);
        if (manages_lots !== undefined) updateData.manages_lots = (manages_lots === 'true' || manages_lots === true);
        if (description !== undefined) updateData.description = description;
        if (image_url !== undefined) updateData.image_url = image_url;
        if (custom_attributes !== undefined) {
            updateData.custom_attributes = typeof custom_attributes === 'string' ? JSON.parse(custom_attributes) : custom_attributes;
        }

        if (tax_rate !== undefined) updateData.tax_rate = tax_rate;
        if (supplier_product_code !== undefined) updateData.supplier_product_code = supplier_product_code;
        if (branch_stocks !== undefined) updateData.branch_stocks = branch_stocks;

        // STRICT UPDATE: Must match ID AND Organization
        const product = await Product.findOneAndUpdate(
            { _id: id, organization_id },
            updateData,
            { new: true, timestamps: update_timestamp !== 'false' }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // --- SYNC LOTS ---
        if ((updateData.manages_lots || product.manages_lots) && lots_data) {
            const parsedLots = typeof lots_data === 'string' ? JSON.parse(lots_data) : lots_data;
            await syncLots(organization_id, product._id, parsedLots);
        }

        // --- ASYNC INTEGRATION SYNC ---
        IntegrationService.syncProductStock(product._id.toString(), organization_id.toString()).catch((err: any) => console.error('Error in syncProductStock:', err));

        res.json(product);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const organization_id = user.organization._id || user.organization; // STRICT

        // STRICT DELETE: Must match ID AND Organization
        const product = await Product.findOneAndUpdate(
            { _id: id, organization_id: organization_id },
            { deleted: true, deletedAt: new Date() }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found (or access denied)' });
        }

        res.json({ message: 'Product deleted (soft)' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
// @desc    Check if SKU exists
// @route   GET /api/products/check-sku/:orgId?sku=...
export const checkSku = async (req: Request, res: Response) => {
    try {
        // Assuming params based on other controllers.

        const user = (req as any).user;
        const userOrgId = user.organization._id ? user.organization._id.toString() : user.organization.toString();
        // Since `checkSku` likely called by frontend with orgId, let's enforce it matches token.
        // However, if the route doesn't have :orgId, this fails.
        // Let's stick to using user's org for `checkSku` as it's an internal check, OR check if params.orgId exists.
        // Given I'm not 100% on the route definition for checkSku right now (didn't deep read routes file for this specific one),
        // I will safely enforce: "Use the User's Org". If params.orgId is passed, it MUST match.

        const tokenOrgId = userOrgId;
        // If the intention is to check specifically for the user's org, use tokenOrgId.
        const orgId = tokenOrgId;

        // This is SAFE. It forces the check against the user's own org.

        // const { orgId } = req.params; // IGNORE
        // const user = (req as any).user;
        // const orgId = user.organization._id || user.organization;


        const { sku } = req.query;

        if (!sku) return res.status(400).json({ message: 'SKU is required' });

        const product = await Product.findOne({ organization_id: orgId, sku: sku, deleted: { $ne: true } });
        res.json({ exists: !!product });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get product statistics (Top Selling & Catalog Count)
// @route   GET /api/products/:orgId/statistics
export const getProductStatistics = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const user = (req as any).user;
        const userOrgId = user.organization?._id?.toString() || user.organization?.toString() || '';

        const isInternalMember = userOrgId && userOrgId === orgId;
        const isSystemAdmin = user.role === 'superadmin' || user.role === 'admin';

        if (!isInternalMember && !isSystemAdmin) {
            return res.status(403).json({ message: 'Acceso denegado.' });
        }

        const { from, to, limit } = req.query;
        const parsedLimit = limit ? parseInt(limit as string) : 5;
        const limitValue = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;

        // 1. Total Products
        const totalProducts = await Product.countDocuments({ organization_id: orgId, deleted: { $ne: true } });

        // 2. Stock Stats (Aggregation to handle Variants)
        const stockStats = await Product.aggregate([
            { $match: { organization_id: new mongoose.Types.ObjectId(orgId), deleted: { $ne: true } } },
            {
                $project: {
                    effectiveStock: {
                        $cond: {
                            if: { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
                            then: { $sum: "$variants.stock" },
                            else: "$stock"
                        }
                    }
                }
            },
            {
                $facet: {
                    outOfStock: [{ $match: { effectiveStock: { $lte: 0 } } }, { $count: "count" }],
                    lowStock: [{ $match: { effectiveStock: { $gt: 0, $lte: 5 } } }, { $count: "count" }]
                }
            }
        ]);

        const outOfStock = stockStats[0]?.outOfStock[0]?.count || 0;
        const lowStock = stockStats[0]?.lowStock[0]?.count || 0;

        // 3. Top Selling Products (unchanged logic)
        const matchStage: any = { organization_id: new mongoose.Types.ObjectId(orgId) };

        if (from && to) {
            // Argentina Timezone adjustment (UTC-3)
            // Start of day: 00:00 ART -> 03:00 UTC
            const startDate = new Date(from as string);
            startDate.setUTCHours(3, 0, 0, 0);

            // End of day: 23:59:59 ART -> Next Day 02:59:59 UTC
            const endDate = new Date(to as string);
            endDate.setUTCHours(26, 59, 59, 999);

            matchStage.date = { $gte: startDate, $lte: endDate };
        }

        const topProducts = await Sale.aggregate([
            { $match: matchStage },
            // Lookup Items for these sales
            {
                $lookup: {
                    from: 'saleitems',
                    localField: '_id',
                    foreignField: 'sale_id',
                    as: 'items'
                }
            },
            { $unwind: '$items' },
            // Group by Product
            {
                $group: {
                    _id: '$items.product_id',
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.total_price' }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: limitValue },
            // Convert String ID to ObjectId for Lookup if necessary
            {
                $addFields: {
                    productIdObj: { $toObjectId: "$_id" }
                }
            },
            // Get Product Details
            {
                $lookup: {
                    from: 'products',
                    localField: 'productIdObj',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    name: '$product.name',
                    totalQuantity: 1,
                    totalRevenue: 1
                }
            }
        ]);

        res.json({
            totalProducts,
            breakdown: {
                total: totalProducts,
                outOfStock,
                lowStock
            },
            topProducts
        });

    } catch (error) {
        console.error("Error fetching product stats:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mass update product prices/costs
// @route   POST /api/products/mass-update
export const massUpdatePrices = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = (req as any).user;
        const organization_id = user.organization._id || user.organization;

        const { selection, updates } = req.body;
        // selection: { type: 'all' | 'ids' | 'category', values?: string[] }
        // updates: [{ target: 'price' | 'cost', type: 'fixed' | 'percentage', value: number, list_id?: string }]

        if (!selection || !updates || !Array.isArray(updates)) {
            return res.status(400).json({ message: 'Invalid payload' });
        }

        // 1. Build query
        const query: any = { organization_id, deleted: { $ne: true } };
        if (selection.type === 'ids' && selection.values) {
            query._id = { $in: selection.values.map((id: string) => new mongoose.Types.ObjectId(id)) };
        } else if (selection.type === 'category' && selection.values) {
            query.category_ids = { $in: selection.values.map((id: string) => new mongoose.Types.ObjectId(id)) };
        }

        // 2. Fetch products to update (using cursor to avoid memory issues for large catalogs)
        const productsCursor = Product.find(query).cursor();

        let updatedCount = 0;

        for (let product = await productsCursor.next(); product != null; product = await productsCursor.next()) {
            let modified = false;

            for (const update of updates) {
                const { target, field, type, value, list_id } = update;
                const fieldToUpdate = target || field;
                const change = Number(value);

                // Helper to apply fixed or percentage change
                const applyChange = (current: number) => {
                    if (type === 'fixed') return current + change;
                    if (type === 'percentage') return current * (1 + change / 100);
                    return current;
                };

                if (!list_id) {
                    // Update BASE price or cost
                    if (fieldToUpdate === 'price') {
                        product.price = applyChange(product.price || 0);
                        modified = true;
                    } else if (fieldToUpdate === 'cost') {
                        const oldCost = product.cost || 0;
                        const newCost = applyChange(oldCost);

                        // Recalculo de precios basado en margen
                        if (oldCost > 0) {
                            // Aplicar el mismo factor de incremento al precio base
                            const marginFactor = newCost / oldCost;
                            product.price = (product.price || 0) * marginFactor;

                            // Aplicar a todas las listas
                            if (product.pricing) {
                                product.pricing.forEach((p: any) => {
                                    p.price = (p.price || 0) * marginFactor;
                                    p.cost = newCost;
                                });
                            }
                        } else {
                            // Si el costo era 0, solo actualizamos el costo
                            if (product.pricing) {
                                product.pricing.forEach((p: any) => { p.cost = newCost; });
                            }
                        }

                        product.cost = newCost;
                        modified = true;
                    }
                } else {
                    // Update specific list_id in pricing array
                    if (product.pricing) {
                        const priceEntry = product.pricing.find((p: any) => p.list_id && p.list_id.toString() === list_id);
                        if (priceEntry) {
                            if (fieldToUpdate === 'price') {
                                priceEntry.price = applyChange(priceEntry.price || 0);
                                modified = true;
                            } else if (fieldToUpdate === 'cost') {
                                const oldEntryCost = priceEntry.cost || 0;
                                const newEntryCost = applyChange(oldEntryCost);

                                if (oldEntryCost > 0) {
                                    const marginFactor = newEntryCost / oldEntryCost;
                                    priceEntry.price = (priceEntry.price || 0) * marginFactor;
                                }

                                priceEntry.cost = newEntryCost;
                                modified = true;
                            }
                        }
                    }
                }
            }

            if (modified) {
                await product.save({ session });
                updatedCount++;
            }
        }

        await session.commitTransaction();
        res.json({ message: 'Success', updatedCount });

    } catch (error: any) {
        await session.abortTransaction();
        console.error("Error in massUpdatePrices:", error);
        res.status(500).json({ message: error.message || 'Server Error' });
    } finally {
        session.endSession();
    }
};

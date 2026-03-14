'use server'

import { productService } from '@/services/productService'
import { requireFeature } from '@/lib/guards'
import { customerService } from '@/services/customerService'
import { supplierService } from '@/services/supplierService'
import { cashService } from '@/services/cashService'
import { priceListService } from '@/services/priceListService'
import { branchService } from '@/services/branchService'
import { categoryService } from '@/services/categoryService'
import { salesService } from '@/services/salesService'
import { format } from 'date-fns'
import { importService } from '@/services/importService'
import { stockLotService } from '@/services/stockLotService'

// Helper to format dates
const formatDate = (date: any) => date ? format(new Date(date), 'dd/MM/yyyy HH:mm') : '-'

export async function exportModuleAction(orgId: string, slug: string, moduleCode: string, options?: any) {
    try {
        let data: any[] = []
        const validModules: Record<string, string> = {
            'inventory': 'Inventario',
            'customers': 'Clientes',
            'suppliers': 'Proveedores',
            'cash': 'Caja'
        }
        const spanishName = validModules[moduleCode] || moduleCode
        // Format filename: "Inventario 11-01-2026.csv" (Slashes are invalid in filenames)
        let filename = `${spanishName} ${format(new Date(), 'dd-MM-yyyy')}.csv`

        switch (moduleCode) {
            case 'inventory':
                // Fetch all needed data
                const [productRes, priceLists, branches, lotsRes, orgRes] = await Promise.all([
                    productService.getAll(orgId, { limit: 100000 }),
                    priceListService.getAll(orgId),
                    branchService.getAll(orgId),
                    stockLotService.getAll(orgId),
                    requireFeature(slug, 'inventory') // Re-fetching/verifying org to check features
                ])

                const products = Array.isArray(productRes) ? productRes : (productRes.data || [])
                const hasLotsFeature = orgRes?.features?.find((f: any) => f.code === 'inventory-lots')?.is_enabled;

                // Map Data
                data = products.map((p: any) => {
                    const rawSupplier = p.supplier_id || p.supplier // Handle both populates
                    const supplierName = rawSupplier?.name || '-'

                    const rawCategories = p.category_ids || p.categories || []
                    const categories = Array.isArray(rawCategories) ? rawCategories.map((c: any) => c.name).join(', ') : '-'

                    const totalStock = p.variants?.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0) || p.stock || 0

                    // Fallback for cost: verify p.cost, then check pricing array
                    const productCost = p.cost || p.pricing?.[0]?.cost || 0

                    // Base Row - Spanish Headers
                    const row: any = {
                        'Nombre': p.name,
                        'Código SKU': p.sku || '-',
                        'Código de Barras': p.barcode || '-',
                        'Código Proveedor': p.supplier_product_code || '-',
                        'Costo de Compra': productCost,
                        'Precio Final': p.price || 0,
                    }

                    // Dynamic Price Columns (Internal Keys)
                    if (Array.isArray(priceLists)) {
                        priceLists.forEach((pl: any) => {
                            const priceItem = p.pricing?.find((pr: any) => pr.list_id === pl._id || pr.list_id === pl.id)
                            row[`Precio: ${pl.name}`] = priceItem ? (priceItem.price || 0) : (p.price || 0)
                        })
                    }

                    // Extra fields for Inventory symmetry
                    row['Stock Actual'] = totalStock
                    row['Stock Mínimo'] = p.min_stock || 0
                    row['Tasa IVA %'] = p.tax_rate || 21
                    row['Categorías'] = categories
                    row['Descripción'] = p.description || '-'

                    // Stock by Branch
                    if (Array.isArray(branches)) {
                        branches.forEach((br: any) => {
                            let bStock = 0;
                            if (p.variants && p.variants.length > 0) {
                                bStock = p.variants.reduce((sum: number, v: any) => {
                                    const vStock = v.branch_stocks && (v.branch_stocks[br._id] ?? v.branch_stocks[br.id]);
                                    return sum + (Number(vStock) || 0);
                                }, 0);
                            } else {
                                bStock = p.branch_stocks && (p.branch_stocks[br._id] ?? p.branch_stocks[br.id]);
                                bStock = Number(bStock) || 0;
                            }
                            row[`Stock: ${br.name}`] = bStock;
                        });
                    }

                    // Lot and Expiration (Conditional)
                    if (hasLotsFeature) {
                        const productLots = Array.isArray(lotsRes) ? lotsRes.filter((l: any) => l.product_id === p._id || l.product_id === p.id) : [];
                        const firstLot = productLots[0];
                        row['Número de Lote'] = firstLot?.lot_number || '-';
                        row['Fecha de Vencimiento'] = firstLot?.expiration_date ? format(new Date(firstLot.expiration_date), 'dd/MM/yyyy') : '-';
                    }

                    // Metadata (Optional but helpful)
                    row['Nombre Proveedor'] = supplierName
                    row['¿Es Visible?'] = p.is_visible ? 'SI' : 'NO'

                    return row
                })
                break;

            case 'customers':
                const customersRes = await customerService.getAll(orgId)
                const customers = Array.isArray(customersRes) ? customersRes : (customersRes.data || [])

                data = customers.map((c: any) => ({
                    'Nombre / Razón Social': c.name,
                    'Código Interno': c.code || '-',
                    'DNI / CUIT': c.doc_number || c.tax_id || '-',
                    'Correo Electrónico': c.email || '-',
                    'Teléfono': c.phone || '-',
                    'Dirección Completa': c.address || '-',
                    'Ciudad / Localidad': c.city || '-',
                    'Provincia': c.province || '-',
                    'Descuento / Recargo %': c.surcharge_rate || 0,
                    'Cuenta Corriente': c.has_active_account ? 'SI' : 'NO',
                    'Saldo Actual': c.credit_balance || 0,
                    'Límite de Crédito': c.credit_limit || 0
                }))
                break;

            case 'suppliers':
                const [suppliersRes, categoriesRes] = await Promise.all([
                    supplierService.getAll(orgId),
                    categoryService.getAll(orgId) // Assuming getAll exists and returns list
                ])
                const suppliers = Array.isArray(suppliersRes) ? suppliersRes : (suppliersRes.data || [])
                const categories = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes.data || [])
                const catMap = new Map(categories.map((c: any) => [c._id || c.id, c.name]))

                data = suppliers.map((s: any) => {
                    const addresses = s.addresses?.map((a: any) =>
                        `${a.street || ''} ${a.gallery ? `(${a.gallery})` : ''}, ${a.city || ''} ${a.province || ''} ${a.postal_code || ''}`.trim()
                    ).filter(Boolean).join(' | ') || '-'

                    const phones = s.phones?.map((p: any) => p.number).filter(Boolean).join(' | ') || s.phone || '-'
                    const emails = s.emails?.map((e: any) => e.email).filter(Boolean).join(' | ') || s.email || '-'

                    const supplierCats = s.category_ids?.map((id: string) => catMap.get(id)).filter(Boolean).join(', ') || '-'

                    return {
                        'Razón Social': s.name,
                        'Código Proveedor': s.code || '-',
                        'CUIT / Identificación': s.tax_id || '-',
                        'Nombre de Contacto': s.contact_name || '-',
                        'Correos': emails,
                        'Teléfonos': phones,
                        'Direcciones': addresses,
                        'Rubros / Categorías': supplierCats,
                        'Sitio Web': s.web_url || '-',
                        'Instagram': s.instagram || '-',
                        'Cuenta Corriente': s.has_active_account ? 'SI' : 'NO',
                        'Límite de Crédito': s.credit_limit || 0,
                        'Saldo Pendiente': s.credit_balance || 0
                    }
                })
                break;

            case 'cash':
                const fromStr = options?.from || format(new Date(), 'yyyy-MM-dd')
                const toStr = options?.to || format(new Date(), 'yyyy-MM-dd')
                const includeOpen = options?.includeOpen !== undefined ? options.includeOpen : true

                const sessionsRes = await cashService.getHistory(orgId, { from: fromStr, to: toStr, includeOpen })

                if (!Array.isArray(sessionsRes)) {
                    const msg = (sessionsRes as any)?.message || 'Respuesta inválida del servidor';
                    throw new Error(`Error obteniendo Cajas: ${msg}`);
                }

                const sessions = sessionsRes;

                data = sessions.map((s: any) => {
                    const stats = s.stats || {}
                    const register = s.cashRegister || {}
                    const branch = register.branch_id || {}

                    return {
                        'ID Organizacion': orgId,
                        'ID Sesión': s._id || '-',
                        'Sucursal': branch.name || 'General',
                        'Caja': register.name || 'Caja Eliminada',
                        'Fecha Apertura': s.openedAt ? format(new Date(s.openedAt), 'dd/MM/yyyy HH:mm') : '-',
                        'Con Cuanto Inicio': s.openingBalance || 0,
                        'Cuanto fue efectivo': stats.cashIncome || 0,
                        'Cuanto Digital': stats.digitalIncome || 0,
                        'Cuanto de Egreso': stats.expenses || 0,
                        'Balance Final': stats.calculatedBalance || 0,
                        'Cierre de Caja': s.closingBalance || '-', // Declared closing
                        'Cajero': s.cashierName || s.openedBy?.name || '-',
                        'Turno': s.shiftName || (s.openedAt ? format(new Date(s.openedAt), 'HH:mm') : '-')
                    }
                })

                filename = `Cajas ${format(new Date(), 'dd-MM-yy')}.xlsx`
                // Ensure Extension matches client expectation (actions.ts passes data, client generates xlsx)
                // Actually return .csv in filename variable here as per helper but client converts to Excel. 
                // Wait, client view uses filename to force extension?
                // `client-view.tsx` replaces .csv with .xlsx in downloadExcel function usually.
                // But let's keep consistency.
                filename = `Cajas ${format(new Date(), 'dd-MM-yy')}.csv`
                break;

            case 'statistics':
                const f = options?.from || format(new Date(), 'yyyy-MM-dd')
                const t = options?.to || format(new Date(), 'yyyy-MM-dd')
                const q = { from: f, to: t, limit: 50 };

                const [allSales, custSt, suppSt, prodSt] = await Promise.all([
                    salesService.getAll(orgId, f, t),
                    customerService.getStatistics(orgId, q),
                    supplierService.getStatistics(orgId, q),
                    productService.getStatistics(orgId, q)
                ]);

                // 1. Sales Sheet (Clean Table)
                let totalSales = 0;
                const methodMap: any = {};

                const translateMethod = (m: string) => {
                    const lower = m.toLowerCase();
                    if (lower.includes('cash') || lower.includes('efectivo')) return 'EFECTIVO';
                    if (lower.includes('debit') || lower.includes('debito')) return 'DÉBITO';
                    if (lower.includes('credit') || lower.includes('credito')) return 'CRÉDITO';
                    if (lower.includes('transfer') || lower.includes('transferencia')) return 'TRANSFERENCIA';
                    if (lower.includes('qr')) return 'QR';
                    if (lower.includes('mp') || lower.includes('mercado')) return 'MERCADO PAGO';
                    return m.toUpperCase();
                };

                (Array.isArray(allSales) ? allSales : []).forEach((s: any) => {
                    const amt = s.total_amount || 0;
                    totalSales += amt;
                    const paymentInfo = s.payments && s.payments.length > 0 ? s.payments : [{ method: s.payment_method || 'Otros', amount: amt }];
                    paymentInfo.forEach((p: any) => {
                        const raw = p.method || 'Otros';
                        const m = translateMethod(raw);
                        methodMap[m] = (methodMap[m] || 0) + (p.amount || 0);
                    });
                });

                // Sales KPIs
                const salesKPIs = [
                    { 'Métrica': 'Total Ingresos', 'Valor': '$' + totalSales.toLocaleString('es-AR') },
                    { 'Métrica': 'Transacciones', 'Valor': Array.isArray(allSales) ? allSales.length : 0 },
                    { 'Métrica': 'Ticket Promedio', 'Valor': '$' + (totalSales > 0 && Array.isArray(allSales) ? (totalSales / allSales.length).toFixed(2) : 0) }
                ];

                const salesTable = Object.entries(methodMap).map(([m, val]) => ({
                    'Método de Pago': m,
                    'Total ($)': val,
                    'Porcentaje': totalSales > 0 ? ((val as number) / totalSales * 100).toFixed(1) + '%' : '0%'
                }));
                salesTable.push({ 'Método de Pago': 'TOTAL', 'Total ($)': totalSales, 'Porcentaje': '100%' });


                // 2. Customers Sheet
                const custKPIs = [
                    { 'Métrica': 'Clientes Totales', 'Valor': custSt?.breakdown?.total || custSt?.breakdown?.totalCustomers || 0 },
                    { 'Métrica': 'Cuentas Activas', 'Valor': custSt?.breakdown?.activeAccounts || 0 },
                    { 'Métrica': 'Cuentas con Deuda', 'Valor': custSt?.breakdown?.debtAccounts || 0 },
                    { 'Métrica': 'DEUDA TOTAL', 'Valor': '$' + (custSt?.totalDebt || 0).toLocaleString('es-AR') }
                ];

                const custSheet = (custSt?.topSpenders || []).map((c: any, index: number) => ({
                    'Ranking': index + 1,
                    'Cliente': c.name,
                    'Cantidad Compras': c.count,
                    'Total Gastado ($)': c.totalSpent
                }));

                // 3. Suppliers Sheet
                const suppKPIs = [
                    { 'Métrica': 'Proveedores Totales', 'Valor': suppSt?.breakdown?.totalSuppliers || 0 },
                    { 'Métrica': 'Cuentas con Deuda', 'Valor': suppSt?.breakdown?.debtAccounts || 0 },
                    { 'Métrica': 'DEUDA TOTAL', 'Valor': '$' + (suppSt?.totalDebt || 0).toLocaleString('es-AR') }
                ];

                const suppSheet = (suppSt?.topSuppliers || []).map((s: any, index: number) => ({
                    'Ranking': index + 1,
                    'Proveedor': s.name,
                    'Cantidad Compras': s.count,
                    'Total Comprado ($)': s.totalSpent
                }));

                // 4. Products Sheet
                const prodKPIs = [
                    { 'Métrica': 'Total en Catálogo', 'Valor': prodSt?.breakdown?.total || 0 },
                    { 'Métrica': 'SIN STOCK (Faltantes)', 'Valor': prodSt?.breakdown?.outOfStock || 0 },
                    { 'Métrica': 'Stock Bajo (Alerta)', 'Valor': prodSt?.breakdown?.lowStock || 0 }
                ];

                const prodSheet = (prodSt?.topProducts || []).map((p: any, index: number) => ({
                    'Ranking': index + 1,
                    'Producto': p.name,
                    'Unidades Vendidas': p.totalQuantity,
                    'Ingresos ($)': p.totalRevenue
                }));

                // Format Dates DD-MM-YYYY
                const [y1, m1, d1] = f.split('-');
                const [y2, m2, d2] = t.split('-');
                const fStr = `${d1}-${m1}-${y1}`;
                const tStr = `${d2}-${m2}-${y2}`;

                // Determine Sheets to Return
                const reportType = options?.reportType || 'all'; // 'sales', 'customers', 'suppliers', 'products', 'all'

                const sheets = [];

                if (reportType === 'all' || reportType === 'sales') {
                    sheets.push({ name: 'Ventas', tables: [{ title: 'Métricas Generales', data: salesKPIs }, { title: 'Desglose por Método', data: salesTable }] });
                }

                if (reportType === 'all' || reportType === 'customers') {
                    sheets.push({ name: 'Clientes', tables: [{ title: 'Estado de Cuentas', data: custKPIs }, { title: 'Top Clientes', data: custSheet }] });
                }

                if (reportType === 'all' || reportType === 'suppliers') {
                    sheets.push({ name: 'Proveedores', tables: [{ title: 'Estado de Cuentas', data: suppKPIs }, { title: 'Top Proveedores', data: suppSheet }] });
                }

                if (reportType === 'all' || reportType === 'products') {
                    sheets.push({ name: 'Productos', tables: [{ title: 'Estado del Inventario', data: prodKPIs }, { title: 'Más Vendidos', data: prodSheet }] });
                }

                const typeMap: Record<string, string> = {
                    'sales': 'Ventas',
                    'customers': 'Clientes',
                    'suppliers': 'Proveedores',
                    'products': 'Productos',
                    'all': 'General'
                };

                const typeName = typeMap[reportType] || 'Reporte';
                const fName = `${d1}-${m1}-${y1}`;
                const tName = `${d2}-${m2}-${y2}`;

                filename = `Estadisticas ${typeName} Desde ${fName} hasta ${tName}.xlsx`;

                return {
                    success: true,
                    sheets,
                    filename
                };
        }

        return { success: true, data, filename }

    } catch (error: any) {
        console.error("Export Error Detail:", error)
        return { error: error.message || 'Error al exportar. Verifique conexión con servidor.' }
    }
}

export async function importModuleAction(orgId: string, slug: string, moduleCode: string, rows: any[], options?: any) {
    try {
        if (!rows || !rows.length) return { success: false, message: 'No hay datos para importar.' };

        // Delegate to API Service
        const res = await importService.importData(orgId, moduleCode, rows, options);

        // Return result
        // Assuming service returns axios response.data which is { success: boolean, processed: number, ... }
        return res;

    } catch (error: any) {
        console.error("Import Action Error:", error);
        return { success: false, message: error.response?.data?.message || error.message || 'Error de conexión con el servidor.' };
    }
}

export async function getExistingIdentifiersAction(orgId: string, moduleCode: string) {
    try {
        switch (moduleCode) {
            case 'inventory':
                const productRes = await productService.getAll(orgId, { limit: 100000 });
                const products = Array.isArray(productRes) ? productRes : (productRes.data || []);
                return {
                    success: true,
                    products: products.map((p: any) => ({ _id: p._id, sku: p.sku, barcode: p.barcode, name: p.name }))
                };
            case 'customers':
                const customersRes = await customerService.getAll(orgId);
                const customers = Array.isArray(customersRes) ? customersRes : (customersRes.data || []);
                return {
                    success: true,
                    customers: customers.map((c: any) => ({ _id: c._id, doc_number: c.doc_number, code: c.code, name: c.name }))
                };
            case 'suppliers':
                const suppliersRes = await supplierService.getAll(orgId);
                const suppliers = Array.isArray(suppliersRes) ? suppliersRes : (suppliersRes.data || []);
                return {
                    success: true,
                    suppliers: suppliers.map((s: any) => ({ _id: s._id, tax_id: s.tax_id, code: s.code, name: s.name }))
                };
            default:
                return { success: false, message: 'Módulo no soportado' };
        }
    } catch (error: any) {
        console.error("Get Identifiers Action Error:", error);
        return { success: false, message: error.message || 'Error al obtener identificadores.' };
    }
}

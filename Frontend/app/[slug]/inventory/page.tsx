
import { notFound, redirect } from 'next/navigation'
import { ProductTableManager } from './product-table-manager'
import { organizationService } from '@/services/organizationService'
import { productService } from '@/services/productService'
import { categoryService } from '@/services/categoryService'

import { supplierService } from '@/services/supplierService'
import { settingsService } from '@/services/settingsService'
import { getServerUser } from '@/lib/server-auth';

import { requireFeature } from '@/lib/guards';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BatchManagement } from './batch-management'

interface Props {
    params: Promise<{ slug: string }>
}

export default async function InventoryPage({ params }: Props) {
    const { slug } = await params

    // 2. Obtener la Organización y Verificar Feature
    const org = await requireFeature(slug, 'inventory');
    const orgId = org._id || org.id;

    // 3. Carga paralela de datos básicos (REAL)
    const [products, categories, suppliers, branches, priceLists] = await Promise.all([
        productService.getAll(orgId),
        categoryService.getAll(orgId),
        supplierService.getAll(orgId),
        settingsService.getBranches(orgId),
        settingsService.getPriceLists(orgId)
    ]);

    const currentUser = await getServerUser();

    // Permissions check for Batch Management
    const isDisabledBatch = org.settings?.disabled_tabs?.includes('batch_management');

    const userPermissions = currentUser?.roleId?.permissions?.find((p: any) => p.module === 'inventory');
    const hasBatchPermission = currentUser?.role === 'admin' || currentUser?.role === 'superadmin' ||
        userPermissions?.tabs?.find((t: any) => t.name === 'batch_management')?.enabled;

    const showBatchManagement = !isDisabledBatch && hasBatchPermission;

    const productsList = Array.isArray(products) ? products : (products?.data || []);
    const categoriesList = Array.isArray(categories) ? categories : (categories?.data || []);
    const suppliersList = Array.isArray(suppliers) ? suppliers : (suppliers?.data || []);

    const productsRes = { data: productsList };
    const categoriesRes = { data: categoriesList };
    const suppliersRes = { data: suppliersList };

    return (
        <div className="p-6 max-w-none mx-auto space-y-8 bg-slate-50/50 min-h-screen">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Inventario
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Gestiona tu catálogo de productos, precios, y stock en tiempo real.</p>
                </div>
            </header>

            <ProductTableManager
                initialProducts={productsRes.data || []}
                categories={categoriesRes.data || []}
                suppliers={suppliersRes.data || []}
                slug={slug}
                orgId={orgId}
                customAttributesConfig={org.settings?.inventory?.custom_attributes || []}
                variantLabels={org.settings?.inventory?.variant_labels || { color: 'Color', size: 'Talle' }}
                barcodeSettings={org.barcodeSettings}
                initialBranches={branches || []}
                initialPriceLists={priceLists || []}
                settings={org.settings}
                currentUser={currentUser}
            />
        </div>
    )
}

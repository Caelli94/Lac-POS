
import { notFound } from 'next/navigation'
import { supplierService } from '@/services/supplierService'
import { organizationService } from '@/services/organizationService'
import { categoryService } from '@/services/categoryService'
import { settingsService } from '@/services/settingsService'
import { SupplierTableManager } from './supplier-table-manager'
import { getServerUser } from '@/lib/server-auth';

import { requireFeature } from '@/lib/guards';

interface Supplier {
    id: string;
    name: string;
    contact_info: string;
}

export default async function SuppliersPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params

    // 1. Obtener Organización y Verificar Feature
    const org = await requireFeature(slug, 'suppliers');

    // 2. Obtener Datos en Paralelo
    const [suppliersResponse, categories, branches, priceLists] = await Promise.all([
        supplierService.getAll(org.id, { page: 1, limit: 50 }),
        categoryService.getAll(org.id),
        settingsService.getBranches(org.id),
        settingsService.getPriceLists(org.id)
    ]);
    const currentUser = await getServerUser();

    // Check if response has data property (paginated) or is array (fallback/error)
    const rawSuppliers = suppliersResponse.data || [];
    const pagination = suppliersResponse.pagination || { total: 0, page: 1, limit: 50, totalPages: 0 };

    const suppliers = rawSuppliers.map((s: any) => ({
        ...s,
        id: s._id || s.id,
    }));

    return (
        <div className="p-6 max-w-none mx-auto space-y-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    Proveedores
                </h1>
                <p className="text-slate-500 text-sm font-medium">Gestiona tus proveedores y sus datos de contacto.</p>
            </header>



            <SupplierTableManager
                initialSuppliers={suppliers}
                initialPagination={pagination}
                categories={categories}
                branches={branches}
                priceLists={priceLists}
                orgId={org.id}
                slug={slug}
                currentUser={currentUser}
                settings={org.settings}
            />
        </div>
    )
}
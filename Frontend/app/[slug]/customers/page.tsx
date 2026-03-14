
import { notFound } from 'next/navigation'
import { organizationService } from '@/services/organizationService'
import { customerService } from '@/services/customerService'
import { CustomerTableManager } from './customer-table-manager'
import { getServerUser } from '@/lib/server-auth';

import { requireFeature } from '@/lib/guards';

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function CustomersPage({ params }: PageProps) {
    const { slug } = await params

    // 1. Obtener Organización y Verificar Feature
    const org = await requireFeature(slug, 'customers');

    // 2. Obtener Clientes (REAL) - Pass initial params
    const response = await customerService.getAll(org.id, { page: 1, limit: 50 });
    const { data, pagination } = response;
    const currentUser = await getServerUser();

    return (
        <div className="p-6 max-w-none mx-auto space-y-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    Clientes
                </h1>
                <p className="text-slate-500 text-sm font-medium">Administra la información de tus clientes y sus cuentas corrientes.</p>
            </header>

            <CustomerTableManager
                initialCustomers={data || []}
                initialPagination={pagination}
                orgId={org.id}
                slug={slug}
                currentUser={currentUser}
                settings={org.settings}
            />
        </div>
    )
}
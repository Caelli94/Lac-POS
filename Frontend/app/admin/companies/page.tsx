import { unstable_noStore as noStore } from 'next/cache';
import { organizationService } from '@/services/organizationService'
import Link from 'next/link'
import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CompaniesTable } from './companies-table'

interface Organization {
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    created_at: string;
    audit_roles: string[];
    storage_usage: number;
}

export default async function CompaniesPage() {
    noStore();
    // 2. Obtener las empresas (REAL)
    const rawOrgs = await organizationService.getAll();
    const organizations: Organization[] = rawOrgs.map((org: any) => ({
        id: org._id || org.id,
        name: org.name,
        slug: org.slug,
        subscription_status: org.subscription_status || 'active',
        created_at: org.createdAt || new Date().toISOString(),
        audit_roles: org.audit_roles || [],
        storage_usage: org.storage_usage || 0
    }));

    return (
        <div className="p-8 min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* ENCABEZADO */}
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Users size={36} className="text-slate-900" />
                            EMPRESAS
                        </h1>
                        <p className="text-slate-500 font-medium">Gestión administrativa de clientes y suscripciones del ecosistema.</p>
                    </div>
                    <Link href="/admin/companies/new">
                        <Button className="h-12 px-8 bg-slate-900 hover:bg-black text-white rounded-xl gap-3 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95">
                            <Plus size={16} />
                            Nueva Empresa
                        </Button>
                    </Link>
                </div>

                {/* COMPONENTE DE TABLA CON BUSCADOR */}
                <CompaniesTable initialOrganizations={organizations} />

            </div>
        </div>
    )
}
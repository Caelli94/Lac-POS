
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CheckingAccountManager from '@/components/CheckingAccountManager'
import { AccountSettings } from '@/components/customers/AccountSettings'
import { organizationService } from '@/services/organizationService'
import { customerService } from '@/services/customerService'

interface PageProps {
    params: Promise<{ slug: string; id: string }>
}

export default async function CustomerDetailPage({ params }: PageProps) {
    // 1. Desempaquetamos los parámetros (Next.js 15+)
    const { slug, id } = await params
    // const supabase = await createClient()

    // 2. Buscamos la Organización
    const org = await organizationService.getBySlug(slug);

    if (!org) return notFound()

    // 3. Buscamos al Cliente (REAL)
    const customer = await customerService.getById(id);

    if (!customer) return notFound()

    // 4. Buscamos la Cuenta Corriente (REAL)
    const account = await customerService.getAccount(id);

    return (
        <div className="max-w-5xl mx-auto p-6">
            {/* ENCABEZADO */}
            <div className="mb-6">
                <Link
                    href={`/${slug}/customers`}
                    className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-block transition-colors"
                >
                    ← Volver a la lista
                </Link>
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-slate-900">{customer.name}</h1>
                    {account?.is_active && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold border border-green-200">
                            Cta. Cte. Activa
                        </span>
                    )}
                </div>
                <p className="text-slate-500 text-sm mt-1">
                    Documento: <span className="font-mono text-slate-700">{customer.doc_number || 'N/A'}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-t border-slate-200 pt-8">

                {/* COLUMNA PRINCIPAL (Izquierda) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* A. CONFIGURACIÓN DE CUENTA (El Interruptor) */}
                    <section>
                        <AccountSettings
                            customerId={id}
                            orgId={org.id}
                            initialIsActive={account?.is_active ?? false}
                            initialLimit={account?.credit_limit ?? 0}
                        />
                    </section>

                    {/* B. GESTOR DE MOVIMIENTOS Y SALDO */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Movimientos y Saldo</h2>
                        <CheckingAccountManager
                            customerId={id}
                            orgId={org.id}
                            slug={slug}
                        />
                    </section>
                </div>

                {/* COLUMNA LATERAL (Derecha - Info estática) */}
                <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 h-fit sticky top-6">
                        <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Datos de Contacto</h3>
                        <ul className="space-y-4 text-sm">
                            <li className="flex flex-col">
                                <span className="text-xs text-slate-400 uppercase font-semibold">Email</span>
                                <span className="text-slate-700 font-medium truncate" title={customer.email || ''}>
                                    {customer.email || '-'}
                                </span>
                            </li>
                            <li className="flex flex-col">
                                <span className="text-xs text-slate-400 uppercase font-semibold">Teléfono</span>
                                <span className="text-slate-700 font-medium">{customer.phone || '-'}</span>
                            </li>
                            <li className="flex flex-col">
                                <span className="text-xs text-slate-400 uppercase font-semibold">Dirección</span>
                                <span className="text-slate-700 font-medium">{customer.address || '-'}</span>
                            </li>
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    )
}
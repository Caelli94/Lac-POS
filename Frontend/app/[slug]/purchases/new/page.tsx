
import { notFound } from 'next/navigation'
import { PurchaseForm } from './purchase-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { organizationService } from '@/services/organizationService'
import { productService } from '@/services/productService'
import { supplierService } from '@/services/supplierService'
import { settingsService } from '@/services/settingsService'

export default async function NewPurchasePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    // const supabase = await createClient()

    // 1. Obtener Org
    const org = await organizationService.getBySlug(slug);
    if (!org) return notFound()

    // 2. Obtener Productos, Proveedores y Sucursales de forma real
    const [productsRes, suppliersRes, branches] = await Promise.all([
        productService.getAll(org.id, { limit: 50 }),
        supplierService.getAll(org.id),
        settingsService.getBranches(org.id)
    ]);

    const products = productsRes.data || [];
    const suppliers = suppliersRes.data || [];


    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Link href={`/${slug}/purchases`} className="text-slate-500 hover:text-slate-800">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">Registrar Entrada de Mercadería</h1>
            </div>

            <PurchaseForm
                products={products || []}
                suppliers={suppliers || []}
                branches={branches || []}
                orgId={org.id}
                slug={slug}
            />
        </div>
    )
}
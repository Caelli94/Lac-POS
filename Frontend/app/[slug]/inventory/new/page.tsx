import { notFound } from 'next/navigation'
import { ProductForm } from './product-form'
import { organizationService } from '@/services/organizationService'

interface Props {
    params: Promise<{ slug: string }>
}

export default async function NewProductPage({ params }: Props) {
    const { slug } = await params
    // const supabase = await createClient()

    // 1. Obtener la organización y datos necesarios en paralelo
    const org = await organizationService.getBySlug(slug);

    if (!org) return notFound()

    /**
     * ACLARACIÓN: Cargamos categorías y proveedores aquí para inyectarlos al Formulario.
     * Esto hace que el componente cliente sea más rápido al no tener que hacer fetches extra.
     */
    const categoriesRes = { data: [] };
    const suppliersRes = { data: [] };

    return (
        <div className="container mx-auto py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto</h1>
                <p className="text-slate-500 text-sm">Crea un nuevo item en el inventario de la organización.</p>
            </div>

            <ProductForm
                orgId={org.id}
                slug={slug}
                isEditMode={false}
                categories={categoriesRes.data || []}
                suppliers={suppliersRes.data || []}
                settings={org.settings}
                onSuccess={() => { }} // No necesario en página directa si redirigís
            />
        </div>
    )
}
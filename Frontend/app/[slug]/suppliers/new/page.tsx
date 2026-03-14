
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupplierAction } from './actions'
import { organizationService } from '@/services/organizationService'

export default async function NewSupplierPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    // const supabase = await createClient()

    const org = await organizationService.getBySlug(slug);
    if (!org) return notFound()

    const createWithOrg = createSupplierAction.bind(null, org.id, slug)

    return (
        <div className="max-w-xl mx-auto mt-10">
            <div className="mb-6">
                {/* Link actualizado apuntando a /suppliers */}
                <Link href={`/${slug}/suppliers`} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-2">
                    <ArrowLeft size={16} /> Volver a la lista
                </Link>
                <h1 className="text-2xl font-bold">Nuevo Proveedor</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Datos de la Empresa / Persona</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={createWithOrg as any} className="space-y-4">

                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre / Razón Social *</Label>
                            <Input id="name" name="name" placeholder="Ej: Distribuidora Oeste S.R.L." required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contact">Información de Contacto</Label>
                            <Input id="contact" name="contact" placeholder="Ej: ventas@distribuidora.com | 11-1234-5678" />
                            <p className="text-xs text-slate-500">Email, teléfono o nombre del vendedor.</p>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" className="gap-2">
                                <Save size={16} /> Guardar Proveedor
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
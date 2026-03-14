
import { requireFeature } from "@/lib/guards";
import { MassUpdateManager } from "./mass-update-manager";
import { categoryService } from "@/services/categoryService";
import { supplierService } from "@/services/supplierService";
import { settingsService } from "@/services/settingsService";
import { getServerUser } from "@/lib/server-auth";

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function MassUpdatePage({ params }: Props) {
    const { slug } = await params;
    const org = await requireFeature(slug, 'mass-update');

    // Cargar datos iniciales para filtros
    const [categories, suppliers, priceLists] = await Promise.all([
        categoryService.getAll(org.id),
        supplierService.getAll(org.id),
        settingsService.getPriceLists(org.id)
    ]);

    // Handle paginated or raw suppliers
    const supplierList = (suppliers as any).data || (Array.isArray(suppliers) ? suppliers : []);
    const categoryList = (categories as any).data || (Array.isArray(categories) ? categories : []);

    const user = await getServerUser();
    const permissions = user?.roleId?.permissions || [];

    return (
        <div className="p-6 max-w-none mx-auto space-y-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    Actualización Masiva
                </h1>
                <p className="text-slate-500 text-sm font-medium">
                    Modifica precios y costos de múltiples productos simultáneamente.
                </p>
            </header>

            <MassUpdateManager
                orgId={org.id}
                slug={slug}
                categories={categoryList}
                suppliers={supplierList}
                priceLists={priceLists}
                settings={org.settings}
                userRole={user?.role}
                permissions={permissions}
            />
        </div>
    );
}

import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function InventoryLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'inventory');

    if (!isAllowed) {
        return <AccessDenied moduleName="Inventario" slug={slug} />;
    }

    return <>{children}</>;
}

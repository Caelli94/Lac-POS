import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function SuppliersLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'suppliers');

    if (!isAllowed) {
        return <AccessDenied moduleName="Proveedores" slug={slug} />;
    }

    return <>{children}</>;
}

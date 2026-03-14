import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function POSLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'pos');

    if (!isAllowed) {
        return <AccessDenied moduleName="Punto de Venta" slug={slug} />;
    }

    return <>{children}</>;
}

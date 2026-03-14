import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function SalesLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'sales');

    if (!isAllowed) {
        return <AccessDenied moduleName="Historial de Ventas" slug={slug} />;
    }

    return <>{children}</>;
}

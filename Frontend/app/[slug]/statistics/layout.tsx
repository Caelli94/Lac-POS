import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function StatisticsLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'statistics');

    if (!isAllowed) {
        return <AccessDenied moduleName="Estadísticas" slug={slug} />;
    }

    return <>{children}</>;
}

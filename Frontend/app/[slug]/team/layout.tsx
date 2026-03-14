import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function TeamLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'team');

    if (!isAllowed) {
        return <AccessDenied moduleName="Equipo" slug={slug} />;
    }

    return <>{children}</>;
}

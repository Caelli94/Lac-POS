import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function IntegrationsLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'integrations');

    if (!isAllowed) {
        return <AccessDenied moduleName="Integraciones" slug={slug} />;
    }

    return <>{children}</>;
}

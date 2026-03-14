import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function MassUpdateLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'mass-update');

    if (!isAllowed) {
        return <AccessDenied moduleName="Actualización Masiva" slug={slug} />;
    }

    return <>{children}</>;
}

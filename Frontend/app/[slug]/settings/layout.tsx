import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function SettingsLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'settings');

    if (!isAllowed) {
        return <AccessDenied moduleName="Ajustes" slug={slug} />;
    }

    return <>{children}</>;
}

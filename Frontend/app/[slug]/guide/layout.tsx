import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function GuideLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'guide');

    if (!isAllowed) {
        return <AccessDenied moduleName="Guía y Documentación" slug={slug} />;
    }

    return <>{children}</>;
}

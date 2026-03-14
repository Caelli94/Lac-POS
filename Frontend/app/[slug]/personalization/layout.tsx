import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function PersonalizationLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'personalization');

    if (!isAllowed) {
        return <AccessDenied moduleName="Personalización" slug={slug} />;
    }

    return <>{children}</>;
}

import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function ChecksLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'checks');

    if (!isAllowed) {
        return <AccessDenied moduleName="Cheques" slug={slug} />;
    }

    return <>{children}</>;
}

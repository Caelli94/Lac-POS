import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function CashLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'cash');

    if (!isAllowed) {
        return <AccessDenied moduleName="Caja" slug={slug} />;
    }

    return <>{children}</>;
}

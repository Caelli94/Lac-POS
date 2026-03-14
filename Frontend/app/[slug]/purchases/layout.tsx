import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function PurchasesLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'purchases');

    if (!isAllowed) {
        return <AccessDenied moduleName="Compras" slug={slug} />;
    }

    return <>{children}</>;
}

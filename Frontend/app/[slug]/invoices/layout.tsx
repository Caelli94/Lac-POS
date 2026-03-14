import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function InvoicesLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'invoices');

    if (!isAllowed) {
        return <AccessDenied moduleName="Facturación" slug={slug} />;
    }

    return <>{children}</>;
}

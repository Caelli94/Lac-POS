import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function CustomersLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'customers');

    if (!isAllowed) {
        return <AccessDenied moduleName="Clientes" slug={slug} />;
    }

    return <>{children}</>;
}

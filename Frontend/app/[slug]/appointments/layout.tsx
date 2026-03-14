import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function AppointmentsLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'appointments');

    if (!isAllowed) {
        return <AccessDenied moduleName="Turnero" slug={slug} />;
    }

    return <>{children}</>;
}

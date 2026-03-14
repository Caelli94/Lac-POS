import { verifyModuleAccess } from '@/lib/guards';
import { AccessDenied } from '../components/access-denied';

export default async function ImportExportLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const isAllowed = await verifyModuleAccess(slug, 'import-export');

    if (!isAllowed) {
        return <AccessDenied moduleName="Importar/Exportar" slug={slug} />;
    }

    return <>{children}</>;
}

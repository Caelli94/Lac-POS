import { requireFeature } from '@/lib/guards';
import { supplierService } from '@/services/supplierService';
import { branchService } from '@/services/branchService';
import ImportExportClientView from './client-view';

interface Props {
    params: Promise<{ slug: string }>
}

export default async function ImportExportPage({ params }: Props) {
    const { slug } = await params;

    // Verify Feature Access & Fetch Org
    const org = await requireFeature(slug, 'import-export');

    // Fetch Suppliers (Server Side) to pass to client
    const rawSuppliers = await supplierService.getAll(org.id);
    const suppliers = Array.isArray(rawSuppliers) ? rawSuppliers.map((s: any) => ({
        ...s,
        id: s._id || s.id
    })) : [];

    // Fetch Branches
    const branches = await branchService.getAll(org.id);

    return <ImportExportClientView org={org} suppliers={suppliers} slug={slug} branches={branches} />;
}

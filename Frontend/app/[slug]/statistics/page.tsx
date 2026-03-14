import { requireFeature } from '@/lib/guards';
import { getServerUser } from '@/lib/server-auth';
import StatisticsClientView from './client-view';

interface Props {
    params: Promise<{ slug: string }>
}

export default async function StatisticsPage({ params }: Props) {
    const { slug } = await params;

    // Verify Feature Access
    const org = await requireFeature(slug, 'statistics');

    const user = await getServerUser();
    const permissions = user?.roleId?.permissions || [];

    return <StatisticsClientView org={org} userRole={user?.role} permissions={permissions} />;
}

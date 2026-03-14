import { organizationService } from '@/services/organizationService'
import { salesService } from '@/services/salesService'
import { notFound } from 'next/navigation'
import InvoicesTable from '@/components/invoices/InvoicesTable'
import { getArgentinaDate } from '@/lib/utils'

interface Props {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function InvoicesPage({ params, searchParams }: Props) {
    const { slug } = await params
    const { from, to, page } = await searchParams
    const org = await organizationService.getBySlug(slug)

    if (!org) return notFound()

    // Default Dates Logic (Server Side)
    // If no params, default to last 5 days
    let dateFrom = from as string;
    let dateTo = to as string;

    if (!dateFrom || !dateTo) {
        // Calculate defaults
        const todayFn = new Date();
        // Adjust for Argentina Time roughly if needed, or just use UTC/Local
        // Ideally reuse getArgentinaDate() logic but it returns string.
        const todayStr = getArgentinaDate();

        const fiveDaysAgo = new Date(todayStr);
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        const startYear = fiveDaysAgo.getFullYear();
        const startMonth = String(fiveDaysAgo.getMonth() + 1).padStart(2, '0');
        const startDay = String(fiveDaysAgo.getDate()).padStart(2, '0');

        if (!dateTo) dateTo = todayStr;
        if (!dateFrom) dateFrom = `${startYear}-${startMonth}-${startDay}`;
    }

    const currentPage = parseInt(page as string) || 1;

    // Fetch Sales
    // We pass limits if needed (e.g. 1000 to show all in period, or pagination)
    // User wants "all invoices" in that period.
    const res = await salesService.getAll(org._id, dateFrom, dateTo, currentPage, 100);

    const initialSales = res.data || [];
    const pagination = res.meta || { total: 0, page: 1, limit: 100, totalPages: 1 };

    return (
        <div className="p-6 max-w-none mx-auto space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Reportes Fiscales
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    Consulta el estado fiscal y genera reportes para el contador (Libro IVA).
                </p>
            </header>

            <InvoicesTable
                slug={slug}
                orgId={org._id}
                initialData={initialSales}
                pagination={pagination}
                defaultFrom={dateFrom}
                defaultTo={dateTo}
            />
        </div>
    )
}

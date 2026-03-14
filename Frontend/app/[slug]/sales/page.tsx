
import { notFound } from 'next/navigation'
import SalesList from '@/components/sales/SalesList'
import { organizationService } from '@/services/organizationService'
import { salesService } from '@/services/salesService'
import { settingsService } from '@/services/settingsService'

import { getServerUser } from '@/lib/server-auth';

import { requireFeature } from '@/lib/guards';


export default async function SalesHistoryPage({ searchParams, params }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }>, params: Promise<{ slug: string }> }) {
    const currentUser = await getServerUser();
    const { slug } = await params
    const { from, to, page } = await searchParams

    const org = await requireFeature(slug, 'sales');

    // Ticket Settings
    const ticketSettings = await settingsService.getTicketSettings(org.id);

    // Real Sales
    // Real Sales
    const currentPage = parseInt(page as string) || 1;
    let rawSales: any[] = [];
    let meta = { total: 0, page: 1, limit: 50, totalPages: 0 };

    // ONLY fetch if dates are provided (User Request: "si yo no hacia una consulta, no debia mostrarse nada")
    if (from && to) {
        const res = await salesService.getAll(org.id, from as string, to as string, currentPage);
        rawSales = res.data;
        meta = res.meta;
    }

    const saleItems = Array.isArray(rawSales) ? rawSales : [];

    const formattedSales = saleItems.map((s: any) => ({
        id: s._id || s.id,
        created_at: s.date || s.createdAt,
        total_amount: s.total_amount,
        status: s.status,
        payment_method: s.payment_method,
        payments: s.payments,
        customers: s.customers,
        sale_items: s.sale_items || [],
        document_type: s.document_type,
        ticket_number: s.ticket_number || (s._id ? s._id.toString().slice(-6).toUpperCase() : '---'),
        discount_general: s.discount_general,
        surcharge_general: s.surcharge_general,
        rounding_difference: s.rounding_difference,
        invoice_letter: s.invoice_letter,
        fiscal_data: s.fiscal_data,
        manual_tax_added: s.manual_tax_added,
        performer: s.performer
    }));

    return (
        <div className="p-6 max-w-none mx-auto space-y-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    Historial de Ventas
                </h1>
                <p className="text-slate-500 text-sm font-medium">Últimas transacciones y cierre de caja en {org.name}.</p>
            </header>



            <SalesList
                initialSales={formattedSales}
                pagination={meta}
                orgId={org.id}
                slug={slug}
                org={org}
                ticketSettings={ticketSettings}
                currentUser={currentUser}
            />
        </div>
    )
}
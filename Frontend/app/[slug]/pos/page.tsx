
// import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { PosInterface } from './pos-interface'
import { organizationService } from '@/services/organizationService'
import { productService } from '@/services/productService'
import { customerService } from '@/services/customerService'
import { settingsService } from '@/services/settingsService'
import { priceListService } from '@/services/priceListService'
import { API_URL } from '@/lib/api-config';

import { RegisterSelector } from './register-selector'

import { requireFeature } from '@/lib/guards';

interface Props {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PosPage({ params, searchParams }: Props) {
    const { slug } = await params
    const query = await searchParams;
    let registerId = query.registerId as string;

    // 1. Organización y Verificar Feature
    const org = await requireFeature(slug, 'pos');

    // 2. Configuración de Ticket
    const ticketSettings = await settingsService.getTicketSettings(org.id);

    // 3. Determinar Caja y Sucursal Activa
    let activeSession = null;
    let availableRegisters = [];
    let showSelector = false;
    let currentRegister = null;
    let activeBranchId: string | null = null;
    let branchName = 'Sucursal Principal';

    try {
        // Resolve Register ID (Priority: Query Param -> Cookie)
        if (!registerId) {
            const cookieStore = await cookies();
            const cookieId = cookieStore.get('lac_terminal_id')?.value;
            if (cookieId) registerId = cookieId;
        }

        // Prepare headers for SSR requests
        const { cookies: getCookies } = await import('next/headers');
        const headers = { Cookie: (await getCookies()).toString() };

        if (!registerId) {
            // Still no ID? Show Selector
            const registersRes = await fetch(`${API_URL}/cash/registers/org/${org.id}`, { cache: 'no-store', headers });
            availableRegisters = await registersRes.json();
            showSelector = true;
        } else {
            // We have an ID (from param or cookie) -> Fetch Context
            const registerRes = await fetch(`${API_URL}/cash/registers/${registerId}`, { cache: 'no-store', headers });

            if (registerRes.ok) {
                currentRegister = await registerRes.json();

                // Determinar Sucursal
                if (currentRegister.branch_id) {
                    activeBranchId = currentRegister.branch_id._id || currentRegister.branch_id.id;
                    branchName = currentRegister.branch_id.name;
                }

                // Fetch session
                const sessionRes = await fetch(`${API_URL}/cash/registers/${registerId}/session`, { cache: 'no-store', headers });
                const sessionData = await sessionRes.json();

                if (sessionData && sessionData.status === 'open') {
                    activeSession = {
                        ...sessionData,
                        cash_registers: { name: currentRegister.name || 'Caja' },
                        branchName
                    };
                } else {
                    activeSession = {
                        cashRegisterId: registerId,
                        cash_registers: { name: currentRegister.name || 'Caja' },
                        branchName,
                        status: 'closed'
                    };
                }
            } else {
                // Invalid ID -> Show Selector
                showSelector = true;
                const registersRes = await fetch(`${API_URL}/cash/registers/org/${org.id}`, { cache: 'no-store', headers });
                availableRegisters = await registersRes.json();
            }
        }
    } catch (e) {
        console.error("Error fetching POS session context:", e);
    }

    if (showSelector) {
        return <RegisterSelector registers={availableRegisters} slug={slug} />;
    }

    // 4. Fetch Productos (con lógica de stock por sucursal)
    const productResponse = await productService.getAll(org.id, { limit: 50 }); // Optimized: Load few, search rest.
    const rawProducts = productResponse.data || (Array.isArray(productResponse) ? productResponse : []);

    console.log(`[DEBUG] POS Products Fetched: ${rawProducts.length}`);

    const products = Array.isArray(rawProducts) ? rawProducts.map((p: any) => {
        let totalStock = 0;
        const hasVariants = p.variants && p.variants.length > 0;

        if (activeBranchId) {
            // Stock específico de la sucursal
            if (hasVariants) {
                totalStock = p.variants.reduce((sum: number, v: any) => {
                    const vStocks = v.branch_stocks || {};
                    const vStock = vStocks[activeBranchId] || 0;
                    return sum + vStock;
                }, 0);
            } else {
                const pStocks = p.branch_stocks || {};
                totalStock = pStocks[activeBranchId] || 0;
            }
        } else {
            // Stock Global (fallback si no hay sucursal o es Principal sin ID)
            if (hasVariants) {
                totalStock = p.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
            } else {
                totalStock = p.stock || 0;
            }
        }

        return {
            ...p,
            current_stock: totalStock
        };
    }) : [];

    // 5. Clientes (Fetch up to 1000 for local search)
    const rawCustomers = await customerService.getAll(org.id, { limit: 1000 });
    const customersData = Array.isArray(rawCustomers) ? rawCustomers : (rawCustomers.data || []);

    const customersWithFlags = customersData.map((c: any) => ({
        id: c.id,
        name: c.name,
        tax_id: c.doc_number,
        has_account: c.has_active_account || false,
        current_account_active: c.has_active_account || false,
        surcharge_rate: c.surcharge_rate || 0
    }));

    // 6. Listas de Precios
    const priceLists = await priceListService.getAll(org.id);

    console.log("DEBUG: Price Lists fetched:", priceLists?.length, JSON.stringify(priceLists));
    console.log("DEBUG: Customers fetched:", customersWithFlags?.length);

    return (
        <div className="h-[calc(100vh-4rem)]">
            <PosInterface
                initialProducts={products || []}
                initialCustomers={customersWithFlags}
                initialPriceLists={Array.isArray(priceLists) ? priceLists : []}
                orgId={org.id}
                currency="$"
                slug={slug}
                activeSession={activeSession}
                org={org}
                ticketSettings={ticketSettings}
                activeBranchId={activeBranchId}
                terminalId={registerId}
            />
        </div>
    )
}
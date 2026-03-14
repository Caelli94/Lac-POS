import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import CashRegisterView from '@/components/cash/CashRegisterView';
import { requireFeature } from '@/lib/guards';
import { format } from 'date-fns';
import { API_URL } from '@/lib/api-config';
import { getServerUser } from '@/lib/server-auth';

const CashPage = async ({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) => {
    const { slug } = await params;
    const resolvedParams = await searchParams;
    const currentUser = await getServerUser();

    // Safely extract params
    const from = resolvedParams.from as string;
    const to = resolvedParams.to as string;
    // Map UI params (hFrom/hTo) to variables
    const history_from = resolvedParams.hFrom as string;
    const history_to = resolvedParams.hTo as string;
    const branch_id = resolvedParams.branch_id as string;
    const register_id = resolvedParams.register_id as string;

    // Default to Today if no range provided
    const today = new Date();
    const defaultDate = format(today, 'yyyy-MM-dd');
    const dateFrom = from || defaultDate;
    const dateTo = to || defaultDate;

    // History Defaults (Last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);
    const defaultHistoryFrom = format(threeDaysAgo, 'yyyy-MM-dd');

    const hFrom = history_from || defaultHistoryFrom;
    const hTo = history_to || defaultDate;

    // 2. Obtener la Organización y Verificar Feature
    const org = await requireFeature(slug, 'cash');

    // Cookie
    const cookieStore = await cookies();
    const terminalId = cookieStore.get('lac_terminal_id')?.value;

    let cashRegister = null;
    let activeSession = null;
    let sales: any[] = [];
    let manualMovements: any[] = [];
    let sessionHistory: any[] = [];
    let registers: any[] = [];
    let branches: any[] = [];

    try {
        const cookieStore = await cookies();
        const headers = { Cookie: cookieStore.toString() };

        // Fetch Registers
        const registersRes = await fetch(`${API_URL}/cash/registers/org/${org.id}`, { cache: 'no-store', headers });
        if (registersRes.ok) {
            registers = await registersRes.json();
        }

        if (Array.isArray(registers) && registers.length > 0) {
            // Priority: Cookie -> First Register
            if (terminalId) {
                cashRegister = registers.find((r: any) => r.id === terminalId || r._id === terminalId);
            }

            if (!cashRegister) {
                cashRegister = registers[0];
            }

            // 4. Si tenemos caja, buscamos sesión activa
            const sessionRes = await fetch(`${API_URL}/cash/registers/${cashRegister.id}/session`, { cache: 'no-store', headers });
            if (sessionRes.ok) {
                activeSession = await sessionRes.json();
            }

            // 5. Historial (GLOBAL CON FILTROS)
            // Fix: Sync History Range with selected Sales Range to avoid confusing UI mismatch
            const hFrom = history_from || dateFrom;
            const hTo = history_to || dateTo;

            const bId = branch_id || '';
            const rId = register_id || '';

            const historyUrl = `${API_URL}/cash/org/${org.id}/history?from=${hFrom}&to=${hTo}&branchId=${bId}&registerId=${rId}`;
            const historyRes = await fetch(historyUrl, { cache: 'no-store', headers });
            if (historyRes.ok) {
                const resJson = await historyRes.json();
                sessionHistory = resJson.data || [];
            }

            // Fetch Branches for filter
            const branchesRes = await fetch(`${API_URL}/branches/org/${org.id}`, { cache: 'no-store', headers });
            branches = branchesRes.ok ? await branchesRes.json() : [];

            // 6. Fetch Movements...
            // Fix: Ensure we fetch ALL movements for the ACTIVE session, even if it started before the filter date
            let realMovementsFrom = dateFrom;
            if (activeSession) {
                const sessionStart = new Date(activeSession.createdAt || activeSession.openedAt);
                const filterStart = new Date(dateFrom);
                if (sessionStart < filterStart) {
                    realMovementsFrom = format(sessionStart, 'yyyy-MM-dd');
                }
            }

            const movementsRes = await fetch(`${API_URL}/cash/registers/${cashRegister.id || cashRegister._id}/movements?from=${realMovementsFrom}&to=${dateTo}`, { cache: 'no-store', headers });
            if (movementsRes.ok) {
                const data = await movementsRes.json();
                sales = data.sales || [];
                manualMovements = data.movements || [];
            }
        }
    } catch (error) {
        console.error("Error fetching cash data:", error);
    }

    return (
        <div className="p-6 max-w-none mx-auto space-y-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    Control de Caja
                </h1>
                <p className="text-slate-500 text-sm font-medium">Gestiona aperturas, cierres y movimientos de efectivo.</p>
            </header>

            {!cashRegister ? (
                <div className="p-10 border-2 border-dashed rounded-xl text-center text-slate-400">
                    No se encontraron cajas registradas o configuradas.
                </div>
            ) : (
                <CashRegisterView
                    initialRegister={cashRegister}
                    allRegisters={registers}
                    allBranches={branches}
                    activeSession={activeSession}
                    initialSales={sales || []}
                    initialManualMovements={manualMovements || []}
                    initialHistory={sessionHistory || []}
                    orgId={org.id}
                    slug={slug}
                    dateRange={{ from: dateFrom, to: dateTo }}
                    historyDateRange={{ from: hFrom, to: hTo }}
                    org={org}
                    ticketSettings={{}}
                    currentUser={currentUser}
                />
            )}
        </div>
    );
}

export default CashPage;
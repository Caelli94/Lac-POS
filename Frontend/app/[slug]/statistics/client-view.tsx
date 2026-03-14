'use client'

import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, Truck, Package, Calendar, DollarSign, CreditCard, RefreshCw, Download, Printer, FileSpreadsheet, ShieldCheck, Filter } from 'lucide-react'
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { downloadExcel } from '@/lib/excelUtils';
import { exportModuleAction } from '../import-export/actions';
import { toast } from 'sonner';
import { API_URL } from '@/lib/api-config';

import { getArgentinaDate } from '@/lib/utils';

interface Props {
    org: any;
    userRole?: string;
    permissions?: any[];
}

export default function StatisticsClientView({ org, userRole, permissions }: Props) {
    // ... state ...
    const [dateFrom, setDateFrom] = useState(() => {
        const today = getArgentinaDate(); // YYYY-MM-DD
        const [year, month] = today.split('-');
        return `${year}-${month}-01`;
    });
    const [dateTo, setDateTo] = useState(() => getArgentinaDate());

    // ... stats state ...
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        total: 0, count: 0, maxSale: 0, topMethod: 'N/A', byMethod: {} as Record<string, number>, byMethodCount: {} as Record<string, number>
    });

    // ... other stats state ...
    const [customerStats, setCustomerStats] = useState({ totalDebt: 0, topSpenders: [] as any[], breakdown: { totalCustomers: 0, totalAccounts: 0, activeAccounts: 0, debtAccounts: 0, cleanAccounts: 0 } });
    const [supplierStats, setSupplierStats] = useState({ totalDebt: 0, topSuppliers: [], breakdown: { totalSuppliers: 0, totalAccounts: 0, activeAccounts: 0, debtAccounts: 0, cleanAccounts: 0 } });
    const [productStats, setProductStats] = useState({ totalProducts: 0, topProducts: [], breakdown: { total: 0, outOfStock: 0, lowStock: 0 } });

    // Limit States
    const [customerLimit, setCustomerLimit] = useState(5);
    const [supplierLimit, setSupplierLimit] = useState(5);
    const [productLimit, setProductLimit] = useState(5);

    // Filter Logic
    const disabledTabs = org?.settings?.disabled_tabs || [];
    let availableTabs = [
        { id: 'sales', icon: BarChart3, label: 'VENTAS' },
        { id: 'customers', icon: Users, label: 'CLIENTES' },
        { id: 'suppliers', icon: Truck, label: 'PROVEEDORES' },
        { id: 'products', icon: Package, label: 'PRODUCTOS' }
    ].filter(t => !disabledTabs.includes(t.id));

    // Role Permission Enforcement
    if (userRole !== 'admin') {
        const modulePerms = permissions?.find((p: any) => p.module === 'statistics');
        if (!modulePerms || !modulePerms.view) {
            availableTabs = [];
        } else if (modulePerms.tabs && modulePerms.tabs.length > 0) {
            const allowedTabIds = modulePerms.tabs.filter((t: any) => t.enabled).map((t: any) => t.name);
            availableTabs = availableTabs.filter(t => allowedTabIds.includes(t.id));
        }
    }

    const [activeTab, setActiveTab] = useState(availableTabs[0]?.id || "");
    const activeOrgId = org?.id;

    if (availableTabs.length === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6 border border-rose-100 shadow-sm">
                    <ShieldCheck size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Acceso Restringido</h2>
                <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium">No tienes permisos habilitados en tu rol para visualizar este módulo.</p>
            </div>
        )
    }

    const fetchSales = async () => {
        if (!org?.id) return;
        setLoading(true);
        try {
            // Build Query
            const params = new URLSearchParams();
            if (dateFrom) params.append('from', dateFrom);
            if (dateTo) params.append('to', dateTo);

            const res = await fetch(`${API_URL}/sales/${org.id}?${params.toString()}`);
            if (!res.ok) throw new Error('Error al cargar ventas');

            const data = await res.json();

            const salesList = (data as any).data || (Array.isArray(data) ? data : []);

            if (Array.isArray(salesList)) {
                setSales(salesList);
                calculateStats(salesList);
            } else {
                setSales([]);
            }

        } catch (error) {
            console.error(error);
            toast.error("Error cargando estadísticas de ventas");
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: any[]) => {
        const newStats = {
            total: 0,
            count: data.length,
            maxSale: 0,
            topMethod: 'N/A',
            byMethod: {} as Record<string, number>,
            byMethodCount: {} as Record<string, number>
        };

        data.forEach(sale => {
            // Calculate Total
            const saleTotal = sale.total_amount || 0;
            newStats.total += saleTotal;
            if (saleTotal > newStats.maxSale) newStats.maxSale = saleTotal;

            // Calculate Payment Methods Breakdown
            // Prioritize 'payments' array (New System)
            if (sale.payments && Array.isArray(sale.payments) && sale.payments.length > 0) {
                sale.payments.forEach((p: any) => {
                    const method = normalizeMethod(p.method);
                    // Ensure we don't NaN if amount is missing
                    const amount = p.amount || 0;
                    newStats.byMethod[method] = (newStats.byMethod[method] || 0) + amount;
                    newStats.byMethodCount[method] = (newStats.byMethodCount[method] || 0) + 1;
                });
            } else {
                // Fallback to legacy 'payment_method' field
                const method = normalizeMethod(sale.payment_method);
                newStats.byMethod[method] = (newStats.byMethod[method] || 0) + saleTotal;
                newStats.byMethodCount[method] = (newStats.byMethodCount[method] || 0) + 1;
            }
        });

        // Find Top Method
        let maxMethodAmount = 0;
        let topMethod = '-';
        Object.entries(newStats.byMethod).forEach(([method, amount]) => {
            if (amount > maxMethodAmount) {
                maxMethodAmount = amount;
                topMethod = method;
            }
        });
        newStats.topMethod = topMethod;

        setStats(newStats);
    };

    const normalizeMethod = (method: string) => {
        if (!method) return 'Otros';
        const m = method.toLowerCase();
        if (m.includes('efectivo') || m === 'cash') return 'Efectivo';

        // Split Cards
        if (m.includes('crédito') || m.includes('credit')) return 'T. Crédito';
        if (m.includes('débito') || m.includes('debit')) return 'T. Débito';
        if (m.includes('tarjeta') || m.includes('card')) return 'Tarjetas'; // Generic fallback

        if (m.includes('transferencia') || m.includes('transfer')) return 'Transferencia';
        if (m.includes('mp') || m.includes('mercado') || m.includes('qr')) return 'MercadoPago';
        if (m.includes('cta') || m.includes('current') || m.includes('account')) return 'Cuenta Corriente';
        if (m.includes('check') || m.includes('cheque')) return 'Cheque';

        // Return capitalized original if not matched
        return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
    };


    // Re-fetch when limits change
    useEffect(() => {
        if (activeOrgId) fetchCustomerStats(customerLimit);
    }, [customerLimit]);

    useEffect(() => {
        if (activeOrgId) fetchSupplierStats(supplierLimit);
    }, [supplierLimit]);

    useEffect(() => {
        if (activeOrgId) fetchProductStats(productLimit);
    }, [productLimit]);


    const fetchCustomerStats = async (limit: number = 5) => {
        if (!activeOrgId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('from', dateFrom);
            if (dateTo) params.append('to', dateTo);
            params.append('limit', limit.toString());

            const res = await fetch(`${API_URL}/customers/${activeOrgId}/statistics?${params.toString()}`);
            if (!res.ok) throw new Error('Error al cargar estadísticas de clientes');

            const data = await res.json();
            setCustomerStats(data);

        } catch (error) {
            console.error(error);
            toast.error("Error cargando reporte de clientes");
        } finally {
            setLoading(false);
        }
    };

    const fetchSupplierStats = async (limit: number = 5) => {
        if (!activeOrgId) return;
        try {
            setLoading(true);
            const query = new URLSearchParams({
                from: dateFrom,
                to: dateTo,
                limit: limit.toString()
            }).toString();

            const res = await fetch(`${API_URL}/suppliers/${activeOrgId}/statistics?${query}`);
            if (res.ok) {
                const data = await res.json();
                setSupplierStats(data);
            } else {
                throw new Error('Error al cargar estadísticas de proveedores');
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar estadísticas de proveedores");
        } finally {
            setLoading(false);
        }
    };

    const fetchProductStats = async (limit: number = 5) => {
        if (!activeOrgId) return;
        try {
            setLoading(true);
            const query = new URLSearchParams({
                from: dateFrom,
                to: dateTo,
                limit: limit.toString()
            }).toString();

            const res = await fetch(`${API_URL}/products/${activeOrgId}/statistics?${query}`);
            if (res.ok) {
                const data = await res.json();
                setProductStats(data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar estadísticas de productos");
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        if (activeOrgId) {
            fetchSales();
            fetchCustomerStats(customerLimit);
            fetchSupplierStats(supplierLimit);
            fetchProductStats(productLimit);
        }
    }, [activeOrgId, dateFrom, dateTo]);



    const handleExportExcel = async () => {
        try {
            setLoading(true);
            toast.loading("Generando reporte Excel...");

            const res = await exportModuleAction(
                org.id,
                org.slug,
                'statistics',
                {
                    from: dateFrom,
                    to: dateTo,
                    reportType: activeTab // 'sales', 'customers', etc.
                }
            );

            if (res.success && res.sheets) {
                await downloadExcel(res.sheets, res.filename);
                toast.dismiss();
                toast.success("Reporte descargado correctamente");
            } else {
                toast.dismiss();
                toast.error("Error al generar el reporte");
            }

        } catch (error) {
            console.error(error);
            toast.dismiss();
            toast.error("Error inesperado al exportar");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 max-w-none mx-auto space-y-6 animate-in fade-in duration-500 print:p-0 print:space-y-4">
            <div className="flex items-center justify-between print:hidden">
                <header className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        Estadísticas
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Resumen de movimientos y métricas.</p>
                </header>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 font-bold border-slate-300">
                                <Download size={16} />
                                Exportar
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Acciones de Reporte</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                                <FileSpreadsheet size={16} className="text-emerald-600" />
                                Descargar Reporte (Excel)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
                                <Printer size={16} className="text-slate-600" />
                                Imprimir Reporte (PDF)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Print Header Override */}
            <div className="hidden print:block mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Reporte de Estadísticas: {activeTab.toUpperCase()}</h1>
                <p className="text-sm text-slate-500">Generado el: {new Date().toLocaleDateString('es-AR')}</p>
            </div>

            <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
                <TabsList className="mb-6 w-full justify-start h-auto p-1 bg-slate-100 rounded-2xl overflow-x-auto print:hidden">
                    {availableTabs.map(tab => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            onClick={() => {
                                if (tab.id === 'customers') fetchCustomerStats(customerLimit);
                                if (tab.id === 'suppliers') fetchSupplierStats(supplierLimit);
                                if (tab.id === 'products') fetchProductStats(productLimit);
                            }}
                            className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold group"
                        >
                            <div className="flex items-center gap-2">
                                <tab.icon size={18} /> {tab.label}
                            </div>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* VENTAS */}
                {!disabledTabs.includes('sales') && (
                    <TabsContent value="sales" className="space-y-6">
                        <DateRangeFilter
                            dateFrom={dateFrom}
                            setDateFrom={setDateFrom}
                            dateTo={dateTo}
                            setDateTo={setDateTo}
                            onFilter={fetchSales}
                            loading={loading}
                        />

                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Total Sales */}
                            <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 border-none text-white shadow-lg shadow-indigo-200">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between opacity-80 mb-4">
                                        <span className="text-sm font-medium uppercase tracking-wider">Total Vendido</span>
                                    </div>
                                    <div className="text-4xl font-black tracking-tight">
                                        ${stats.total.toLocaleString('es-AR')}
                                    </div>
                                    <div className="mt-2 text-indigo-100 text-sm font-medium">
                                        Ingresos brutos por ventas
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="grid grid-cols-2 gap-4 p-4 border shadow-sm bg-white">
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-slate-500 font-bold">Ventas Realizadas</span>
                                    <div className="text-2xl font-black text-slate-900">{stats.count}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-slate-500 font-bold">Ticket Promemedio</span>
                                    <div className="text-2xl font-black text-slate-900">
                                        {stats.count > 0 ? `$${(Math.round(stats.total / stats.count)).toLocaleString('es-AR')}` : '$0'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-green-600 font-bold">Mayor Venta</span>
                                    <div className="text-2xl font-black text-green-700">${stats.maxSale.toLocaleString('es-AR')}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-blue-500 font-bold">Método Top</span>
                                    <div className="text-xl font-black text-blue-600 truncate">{stats.topMethod}</div>
                                </div>
                            </Card>

                            {/* Payment Breakdown */}
                            <Card className="md:col-span-2 border shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <CreditCard className="h-5 w-5 text-slate-400" />
                                        Métodos de Pago
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {Object.entries(stats.byMethod).sort(([, a], [, b]) => b - a).map(([method, amount]) => {
                                            const percentage = stats.total > 0 ? ((amount / stats.total) * 100).toFixed(1) : '0';
                                            const count = stats.byMethodCount[method] || 0;
                                            return (
                                                <div key={method} className="space-y-1">
                                                    <div className="flex justify-between text-sm font-medium text-slate-700">
                                                        <span>{method} <span className="text-slate-400 text-xs font-normal">({count})</span></span>
                                                        <span>${amount.toLocaleString('es-AR')} ({percentage}%)</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {Object.keys(stats.byMethod).length === 0 && (
                                            <div className="text-center py-4 text-slate-400 text-sm">No hay datos de métodos de pago en este período.</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                    </TabsContent>
                )}

                {/* CUSTOMERS TAB */}
                {!disabledTabs.includes('customers') && (
                    <TabsContent value="customers" className="space-y-6">
                        <DateRangeFilter
                            dateFrom={dateFrom}
                            setDateFrom={setDateFrom}
                            dateTo={dateTo}
                            setDateTo={setDateTo}
                            onFilter={fetchCustomerStats}
                            loading={loading}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Total Debt Card */}
                            <Card className="bg-gradient-to-br from-rose-500 to-orange-600 border-none text-white shadow-lg shadow-rose-200">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between opacity-80 mb-4">
                                        <span className="text-sm font-medium uppercase tracking-wider">Deuda Corriente Total</span>
                                    </div>
                                    <div className="text-4xl font-black tracking-tight">
                                        ${customerStats.totalDebt.toLocaleString('es-AR')}
                                    </div>
                                    <div className="mt-2 text-rose-100 text-sm font-medium">
                                        Suma de todas las cuentas por cobrar
                                    </div>
                                </CardContent>
                            </Card>

                            {/* NEW STATS for Customers */}
                            <Card className="grid grid-cols-2 gap-4 p-4 border shadow-sm bg-white">
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-slate-500 font-bold">Total Clientes</span>
                                    <div className="text-2xl font-black text-slate-800">{customerStats.breakdown?.totalCustomers || 0}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-slate-500 font-bold">Cuentas Ctes.</span>
                                    <div className="text-2xl font-black text-slate-800">{customerStats.breakdown?.activeAccounts || 0}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-green-600 font-bold">Al Día</span>
                                    <div className="text-2xl font-black text-green-700">{customerStats.breakdown?.cleanAccounts || 0}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-red-500 font-bold">Morosas</span>
                                    <div className="text-2xl font-black text-red-600">{customerStats.breakdown?.debtAccounts || 0}</div>
                                </div>
                            </Card>

                            {/* Top Spenders */}
                            <Card className="md:col-span-2 border shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Users className="h-5 w-5 text-slate-400" />
                                            Top Clientes que Más Compraron
                                        </CardTitle>
                                        <CardDescription>En el período seleccionado</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 font-medium">Ver:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                                            value={customerLimit}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val) && val > 0) setCustomerLimit(val);
                                                else if (e.target.value === '') setCustomerLimit(0); // Temporary for typing
                                            }}
                                            onBlur={() => { if (customerLimit < 1) setCustomerLimit(5); }}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {customerStats.topSpenders.map((customer, index) => {
                                            const maxSpent = customerStats.topSpenders[0]?.totalSpent || 1;
                                            const percentage = ((customer.totalSpent / maxSpent) * 100).toFixed(0);

                                            return (
                                                <div key={index} className="space-y-2">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="font-bold text-slate-700">
                                                            #{index + 1} {customer.name} <span className="text-slate-400 text-xs font-normal">({customer.count})</span>
                                                        </span>
                                                        <span className="font-mono font-medium text-slate-900">${customer.totalSpent.toLocaleString('es-AR')}</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {customerStats.topSpenders.length === 0 && (
                                            <div className="text-center py-6 text-slate-400">No hay datos en este período.</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                )}

                {!disabledTabs.includes('suppliers') && (
                    <TabsContent value="suppliers" className="space-y-6">
                        <DateRangeFilter
                            dateFrom={dateFrom}
                            setDateFrom={setDateFrom}
                            dateTo={dateTo}
                            setDateTo={setDateTo}
                            onFilter={fetchSupplierStats}
                            loading={loading}
                        />

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* DEBT CARD */}
                            <Card className="border-none shadow-md bg-gradient-to-br from-rose-500 to-pink-600 text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between opacity-80 mb-4">
                                        <span className="text-sm font-medium uppercase tracking-wider">Deuda Total a Proveedores</span>
                                    </div>
                                    <div className="text-4xl font-black tracking-tight">
                                        {loading ? '...' : `$${supplierStats.totalDebt.toLocaleString('es-AR')}`}
                                    </div>
                                    <div className="mt-2 text-rose-100 text-sm font-medium">
                                        Saldo pendiente en cuentas corrientes
                                    </div>
                                </CardContent>
                            </Card>

                            {/* SUPPLIER BREAKDOWN */}
                            <Card className="grid grid-cols-2 gap-4 p-4 border shadow-sm bg-white">
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-slate-500 font-bold">Total Proveedores</span>
                                    <div className="text-2xl font-black text-slate-800">{supplierStats.breakdown?.totalSuppliers || 0}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-slate-500 font-bold">Cuentas Ctes.</span>
                                    <div className="text-2xl font-black text-slate-800">{supplierStats.breakdown?.activeAccounts || 0}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-green-600 font-bold">Al Día</span>
                                    <div className="text-2xl font-black text-green-700">{supplierStats.breakdown?.cleanAccounts || 0}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-red-500 font-bold">Con Deuda</span>
                                    <div className="text-2xl font-black text-red-600">{supplierStats.breakdown?.debtAccounts || 0}</div>
                                </div>
                            </Card>

                            {/* TOP SUPPLIERS */}
                            <Card className="md:col-span-2 border-none shadow-sm bg-white">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div>
                                        <CardTitle>Top Proveedores</CardTitle>
                                        <CardDescription>Proveedores con mayor volumen de compra en el periodo</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 font-medium">Ver:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-rose-500 focus:outline-none"
                                            value={supplierLimit}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val) && val > 0) setSupplierLimit(val);
                                                else if (e.target.value === '') setSupplierLimit(0);
                                            }}
                                            onBlur={() => { if (supplierLimit < 1) setSupplierLimit(5); }}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {supplierStats.topSuppliers.length === 0 ? (
                                            <p className="text-sm text-slate-400">No hay datos de compras en este periodo.</p>
                                        ) : (
                                            supplierStats.topSuppliers.map((supplier: any, i) => (
                                                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {supplier.name} <span className="text-slate-400 text-xs font-normal">({supplier.count})</span>
                                                            </p>
                                                            <p className="text-xs text-slate-500">{supplier.count} compras</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-slate-800">
                                                        ${supplier.totalSpent.toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                )}
                {!disabledTabs.includes('products') && (
                    <TabsContent value="products" className="space-y-6">
                        <DateRangeFilter
                            dateFrom={dateFrom}
                            setDateFrom={setDateFrom}
                            dateTo={dateTo}
                            setDateTo={setDateTo}
                            onFilter={fetchProductStats}
                            loading={loading}
                        />

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* TOTAL PRODUCTS CARD */}
                            <Card className="border-none shadow-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between opacity-80 mb-4">
                                        <span className="text-sm font-medium uppercase tracking-wider">Total de Productos</span>
                                    </div>
                                    <div className="text-4xl font-black tracking-tight">
                                        {loading ? '...' : productStats.totalProducts}
                                    </div>
                                    <div className="mt-2 text-emerald-100 text-sm font-medium">
                                        Items registrados en catálogo
                                    </div>
                                </CardContent>
                            </Card>

                            {/* PRODUCT BREAKDOWN */}
                            <Card className="grid grid-cols-2 gap-4 p-4 border shadow-sm bg-white">
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-slate-500 font-bold">Total Items</span>
                                    <div className="text-2xl font-black text-slate-800">{productStats.breakdown?.total || 0}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-slate-500 font-bold">En Stock</span>
                                    <div className="text-2xl font-black text-slate-800">
                                        {(productStats.breakdown?.total || 0) - (productStats.breakdown?.outOfStock || 0)}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-orange-500 font-bold">Poco Stock</span>
                                    <div className="text-2xl font-black text-orange-600">{productStats.breakdown?.lowStock || 0}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs uppercase text-red-500 font-bold">Sin Stock</span>
                                    <div className="text-2xl font-black text-red-600">{productStats.breakdown?.outOfStock || 0}</div>
                                </div>
                            </Card>

                            {/* TOP SELLING PRODUCTS */}
                            <Card className="md:col-span-2 border-none shadow-sm bg-white">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div>
                                        <CardTitle>Productos Más Vendidos</CardTitle>
                                        <CardDescription>Por cantidad de unidades vendidas</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 font-medium">Ver:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                                            value={productLimit}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (!isNaN(val) && val > 0) setProductLimit(val);
                                                else if (e.target.value === '') setProductLimit(0);
                                            }}
                                            onBlur={() => { if (productLimit < 1) setProductLimit(5); }}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {productStats.topProducts.length === 0 ? (
                                            <p className="text-sm text-slate-400">No hay datos de ventas en este periodo.</p>
                                        ) : (
                                            productStats.topProducts.map((product: any, i) => (
                                                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">{product.name}</p>
                                                            <p className="text-xs text-slate-500">{product.totalQuantity} unidades</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-slate-800">
                                                        ${product.totalRevenue.toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}

function DateRangeFilter({ dateFrom, setDateFrom, dateTo, setDateTo, onFilter, loading }: any) {
    const fromRef = useRef<HTMLInputElement>(null);
    const toRef = useRef<HTMLInputElement>(null);

    return (
        <Card className="border-none shadow-sm bg-white">
            <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                    {/* DATE FROM */}
                    <div
                        className="relative group cursor-pointer"
                        onClick={() => fromRef.current?.showPicker()}
                    >
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-100 transition-colors pointer-events-none">
                            <span className="text-xs font-bold text-slate-500 uppercase">DESDE:</span>
                            <span className="text-sm font-bold text-slate-700">
                                {dateFrom ? new Date(dateFrom).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'Seleccionar'}
                            </span>
                        </div>
                        <input
                            ref={fromRef}
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="invisible absolute bottom-0 left-0" // Hidden but functional via showPicker
                            style={{ width: 0, height: 0, opacity: 0 }}
                        />
                    </div>

                    {/* DATE TO */}
                    <div
                        className="relative group cursor-pointer"
                        onClick={() => toRef.current?.showPicker()}
                    >
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-100 transition-colors pointer-events-none">
                            <span className="text-xs font-bold text-slate-500 uppercase">HASTA:</span>
                            <span className="text-sm font-bold text-slate-700">
                                {dateTo ? new Date(dateTo).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'Seleccionar'}
                            </span>
                        </div>
                        <input
                            ref={toRef}
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="invisible absolute bottom-0 left-0" // Hidden but functional via showPicker
                            style={{ width: 0, height: 0, opacity: 0 }}
                        />
                    </div>

                    <Button
                        onClick={onFilter}
                        disabled={loading}
                        className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-8 h-10 tracking-widest rounded-xl transition-all shadow-lg shadow-slate-200"
                    >
                        {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : <><Filter className="mr-2 h-3 w-3" /> FILTRAR</>}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

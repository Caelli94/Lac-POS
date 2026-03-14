'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    CheckCircle, AlertCircle, FileText, RefreshCw, Printer, MoreVertical,
    MessageCircle, FileDown, CheckSquare, X, Filter, ChevronLeft, ChevronRight,
    Search, CalendarDays
} from "lucide-react";
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { printTicket } from "@/utils/printTicket";

interface Sale {
    _id: string; // Backend ID
    id: string; // Sometimes frontend uses alias? Backend sends _id usually.
    date: string;
    total_amount: number;
    invoice_letter: string;
    document_type: string;
    customer_id?: string;
    payment_method: string;
    customers?: {
        name: string;
        doc_type?: string;
        doc_number?: string;
        phone?: string;
        tax_id?: string; // Keep for safety if legacy exists
    };
    fiscal_data?: any;
    afip_data?: {
        cae: string;
        cae_expiration: string;
        cbte_nro: number;
    };
    performer?: {
        name: string;
    };
    items?: any[]; // Need items for print
    sale_items?: any[];
}

interface Props {
    slug: string;
    initialData?: Sale[];
    orgId: string;
    pagination?: any;
    defaultFrom?: string;
    defaultTo?: string;
}

export default function InvoicesTable({ slug, orgId, initialData = [], pagination, defaultFrom, defaultTo }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [sales, setSales] = useState<Sale[]>(initialData);
    const [fiscalizingId, setFiscalizingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkFiscalizing, setIsBulkFiscalizing] = useState(false);

    // Update sales when initialData changes (server Refresh)
    useEffect(() => {
        setSales(initialData);
    }, [initialData]);

    // Filters State - Initialize from URL or Props (Defaults)
    const [dateFrom, setDateFrom] = useState<string>(searchParams.get('from') || defaultFrom || '');
    const [dateTo, setDateTo] = useState<string>(searchParams.get('to') || defaultTo || '');
    const fromRef = useRef<HTMLInputElement>(null);
    const toRef = useRef<HTMLInputElement>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // Sync state with URL params if they change externally (e.g. browser back button)
    useEffect(() => {
        const pFrom = searchParams.get('from');
        const pTo = searchParams.get('to');
        if (pFrom) setDateFrom(pFrom);
        if (pTo) setDateTo(pTo);
    }, [searchParams]);

    const [organization, setOrganization] = useState<any>(null);

    useEffect(() => {
        const fetchOrganization = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations/${orgId}`);
                if (res.ok) {
                    const data = await res.json();
                    setOrganization(data);
                }
            } catch (error) {
                console.error("Error fetching org:", error);
            }
        };
        fetchOrganization();
    }, [orgId]);

    const handleFilter = () => {
        if (!dateFrom && !dateTo) {
            startTransition(() => { router.push('?') });
            return;
        }

        if (!dateFrom && dateTo) return toast.error("Seleccione Fecha Desde");
        if (dateFrom && !dateTo) return toast.error("Seleccione Fecha Hasta");

        // Validate range (Max 3 months = approx 92 days)
        const dFrom = new Date(dateFrom);
        const dTo = new Date(dateTo);

        const diffDays = Math.ceil(Math.abs(dTo.getTime() - dFrom.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 93) return toast.error("El rango máximo permitido es de 3 meses");
        if (dFrom > dTo) return toast.error("Fecha Desde no puede ser mayor a Fecha Hasta");

        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('from', dateFrom);
            params.set('to', dateTo);
            // Reset page on filter change? Yes.
            params.delete('page');
            router.push(`?${params.toString()}`);
        });
    };

    const handleFiscalize = async (sale: Sale) => {
        try {
            setFiscalizingId(sale._id);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/afip/invoice/${sale._id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Fiscalization Error Details:", err);
                throw new Error(err.message || err.error || 'Error desconocido al fiscalizar');
            }

            const data = await res.json();

            // Update local state
            if (data.data?.afip_data) {
                setSales(prev => prev.map(s =>
                    s._id === sale._id ? { ...s, afip_data: data.data.afip_data, invoice_letter: data.data.invoice_letter, document_type: data.data.document_type } : s
                ));
                toast.success(`CAE Generado: ${data.data.afip_data.cae}`);
                router.refresh(); // Refresh server data too
                return true;
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Falló la fiscalización");
            return false;
        } finally {
            setFiscalizingId(null);
        }
    };

    const handleBulkFiscalize = async () => {
        if (selectedIds.size === 0) return;

        setIsBulkFiscalizing(true);
        const idsToProcess = Array.from(selectedIds);

        for (const id of idsToProcess) {
            const sale = sales.find(s => s._id === id);
            if (sale && !sale.afip_data?.cae) {
                await handleFiscalize(sale);
            }
        }

        setIsBulkFiscalizing(false);
        setSelectedIds(new Set()); // Clear selection
    };

    const handleBulkExportCsv = () => {
        if (selectedIds.size === 0) return;

        // Build CSV Content
        // Header
        const header = ['Fecha', 'Comprobante', 'Numero', 'Cliente', 'CUIT/DNI', 'Total', 'CAE', 'Vto CAE'];
        const rows = [];

        const idsToProcess = Array.from(selectedIds);

        for (const id of idsToProcess) {
            const s = sales.find(sale => sale._id === id);
            if (!s) continue;

            const date = new Date(s.date).toLocaleDateString();
            const type = `${s.invoice_letter || 'X'} - ${(s.document_type || 'TICKET').toUpperCase()}`;
            const number = s.afip_data?.cbte_nro || s.id || '';
            const customer = s.customers?.name || 'Consumidor Final';
            const doc = s.customers?.doc_number || s.customers?.tax_id || '';
            const total = s.total_amount.toFixed(2);
            const cae = s.afip_data?.cae || '';
            const caeVto = s.afip_data?.cae_expiration || '';

            rows.push([date, type, number, customer, doc, total, cae, caeVto].join(','));
        }

        const csvContent = "data:text/csv;charset=utf-8,"
            + header.join(',') + "\n"
            + rows.join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_ventas_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Reporte descargado correctamente");
        setSelectedIds(new Set());
    };


    const handlePrint = async (sale: Sale) => {
        try {
            // Normalize Items
            const rawItems = sale.sale_items || sale.items || [];
            const mappedItems = rawItems.map((item: any) => ({
                name: item.product_name || item.name || 'Producto sin nombre',
                quantity: item.quantity || 1,
                price: item.unit_price || item.price || 0,
                total_price: item.total_price || (item.quantity * item.unit_price) // Ensure totals calculation
            }));

            const ticketConfig = {
                headerText: '',
                footerText: '',
                width: '80mm' as '80mm',
            };

            const orgData = {
                name: organization?.name || 'Mi Negocio',
                address: organization?.business_address || organization?.address || '',
                taxId: organization?.identifier || organization?.cuit || 'Not Configured',
                vatCondition: organization?.afip_settings?.tax_condition || 'Resp. Inscripto',
                startDate: organization?.afip_settings?.start_activity_date,
                iibb: organization?.afip_settings?.gross_income,
            };

            printTicket({
                organization: orgData,
                sale: {
                    id: sale.id || sale._id,
                    date: sale.date,
                    items: mappedItems,
                    total: sale.total_amount,
                    paymentMethod: sale.payment_method,
                    invoiceLetter: sale.invoice_letter,
                    fiscalData: sale.fiscal_data,
                    // Inject CAE if present
                    ...(sale.afip_data ? {
                        cae: sale.afip_data.cae,
                        caeExpiration: sale.afip_data.cae_expiration
                    } : {})
                },
                settings: ticketConfig
            });
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Error al generar PDF");
        }
    };

    const handleWhatsApp = (sale: Sale) => {
        const phone = sale.customers?.phone || '';
        const cleanPhone = phone.replace(/\D/g, ''); // Strip non-digits

        let message = `Hola ${sale.customers?.name || 'Cliente'}, te envío el comprobante de tu compra por $${sale.total_amount.toLocaleString('es-AR')}.`;

        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleDownloadCsv = (sale: Sale) => {
        // Simple CSV Export
        const rows = [
            ['Concepto', 'Cantidad', 'Precio Unit', 'Total'],
            ...(sale.sale_items || []).map((item: any) => [
                item.product_name,
                item.quantity,
                item.unit_price,
                item.total_price
            ])
        ];

        const csvContent = "data:text/csv;charset=utf-8,"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `comprobante_${sale.id || sale._id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const docTypeMap: Record<string, string> = {
        'invoice': 'FACTURA',
        'invoice_a': 'FACTURA A',
        'invoice_b': 'FACTURA B',
        'invoice_c': 'FACTURA C',
        'credit_note': 'NOTA DE CRÉDITO',
        'debit_note': 'NOTA DE DÉBITO',
        'ticket': 'TICKET',
        'quotation': 'PRESUPUESTO'
    };

    const filteredSales = sales.filter(s => {
        // Only CLIENT-SIDE text and status filtering now.
        // Date filtering is handled by Server via URL params.

        // 1. Text Search
        const term = searchTerm.toLowerCase();
        const termClean = term.replace(/\D/g, ''); // For CUIT matching
        const idMatch = s._id.toLowerCase().includes(term);
        const nameMatch = s.customers?.name?.toLowerCase().includes(term);
        const taxId = s.customers?.doc_number || s.customers?.tax_id || '';
        const taxIdClean = taxId.replace(/\D/g, '');
        const cuitMatch = taxId.includes(term) || (termClean.length > 3 && taxIdClean.includes(termClean));
        const matchesTerm = idMatch || nameMatch || cuitMatch;

        // 3. Status Filter
        const hasCae = !!s.afip_data?.cae;
        if (statusFilter === 'pending' && hasCae) return false;
        if (statusFilter === 'completed' && !hasCae) return false;

        // 4. Type Filter
        if (typeFilter !== 'all') {
            if (typeFilter === 'A' && s.invoice_letter !== 'A') return false;
            if (typeFilter === 'B' && s.invoice_letter !== 'B') return false;
            if (typeFilter === 'C' && s.invoice_letter !== 'C') return false;
        }

        return matchesTerm;
    });

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredSales.length && filteredSales.length > 0) {
            setSelectedIds(new Set());
        } else {
            const allIds = new Set(filteredSales.map(s => s._id));
            setSelectedIds(allIds);
        }
    };

    const toggleSelectRow = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setDateFrom('');
        setDateTo('');
        setStatusFilter('all');
        setTypeFilter('all');
        startTransition(() => { router.push('?') }); // Clear URL
    };

    return (
        <div className="space-y-4">
            {/* Filters & Actions Bar */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border shadow-sm">
                    {/* Search - Always visible */}
                    <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 flex-1 max-w-xl">
                        <div className="px-3 h-9 bg-slate-200 rounded-lg flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase border border-slate-300">
                            <Search size={14} /> BUSCAR
                        </div>
                        <Input
                            placeholder="Buscar (Nombre, CUIT)..."
                            className="bg-transparent border-0 focus-visible:ring-0 text-slate-900 text-sm h-9 shadow-none flex-1"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* DATE FILTERS */}
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 cursor-pointer" onClick={() => fromRef.current?.showPicker()}>
                            <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">Desde:</div>
                            <input
                                ref={fromRef}
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-transparent border-none text-[10px] font-bold uppercase text-slate-700 focus:ring-0 h-9 [&::-webkit-calendar-picker-indicator]:hidden"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 cursor-pointer" onClick={() => toRef.current?.showPicker()}>
                            <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">Hasta:</div>
                            <input
                                ref={toRef}
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-transparent border-none text-[10px] font-bold uppercase text-slate-700 focus:ring-0 h-9 [&::-webkit-calendar-picker-indicator]:hidden"
                            />
                        </div>

                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleFilter}
                            disabled={isPending}
                            className="bg-slate-900 text-white h-10 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-none"
                        >
                            {isPending ? <RefreshCw className="animate-spin h-3 w-3" /> : <><Filter className="mr-2 h-3 w-3" /> Filtrar</>}
                        </Button>

                        <div className="w-px h-8 bg-slate-200 mx-1"></div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[160px] h-10 text-[10px] font-black uppercase tracking-wider rounded-xl border-slate-200 bg-slate-50/50">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-bold uppercase text-[10px]">Todos los Estados</SelectItem>
                                <SelectItem value="pending" className="font-bold uppercase text-[10px]">Pendientes</SelectItem>
                                <SelectItem value="completed" className="font-bold uppercase text-[10px]">Completadas</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[140px] h-10 text-[10px] font-black uppercase tracking-wider rounded-xl border-slate-200 bg-slate-50/50">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-bold uppercase text-[10px]">Todos los Tipos</SelectItem>
                                <SelectItem value="A" className="font-bold uppercase text-[10px]">Factura A</SelectItem>
                                <SelectItem value="B" className="font-bold uppercase text-[10px]">Factura B</SelectItem>
                                <SelectItem value="C" className="font-bold uppercase text-[10px]">Factura C</SelectItem>
                            </SelectContent>
                        </Select>

                        {(searchParams.get('from') || searchParams.get('to') || statusFilter !== 'all' || typeFilter !== 'all' || searchTerm) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl"
                            >
                                <X size={14} className="mr-2" /> Limpiar
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* TABLE CONTAINER */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
                <div className="p-4 border-b bg-slate-50/30">

                    {/* Bulk Actions Context Bar */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <CheckSquare className="h-4 w-4 text-indigo-600" />
                                <span className="text-sm font-medium text-indigo-700">{selectedIds.size} seleccionadas</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleBulkExportCsv}
                                    className="bg-white hover:bg-slate-50 text-slate-700 h-8 text-xs shadow-sm border-indigo-200"
                                >
                                    <FileDown className="mr-2 h-3 w-3 text-green-600" />
                                    Exportar Excel
                                </Button>

                                <Button
                                    size="sm"
                                    onClick={handleBulkFiscalize}
                                    disabled={isBulkFiscalizing}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs shadow-sm"
                                >
                                    {isBulkFiscalizing ? (
                                        <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                                    ) : (
                                        <CheckSquare className="mr-2 h-3 w-3" />
                                    )}
                                    {isBulkFiscalizing ? 'Procesando...' : 'Fiscalizar Pendientes'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[40px]">
                                    <Checkbox
                                        checked={filteredSales.length > 0 && selectedIds.size === filteredSales.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Comprobante</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-center">Operador</TableHead>
                                <TableHead className="text-center">Estado Fiscal</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSales.map((sale) => {
                                const hasCae = !!sale.afip_data?.cae;

                                // Translation logic
                                const rawType = (sale.document_type || 'ticket').toLowerCase();
                                const translatedType = docTypeMap[rawType] || docTypeMap[rawType.split('_')[0]] || rawType.toUpperCase().replace('_', ' ');

                                return (
                                    <TableRow key={sale._id} data-state={selectedIds.has(sale._id) ? "selected" : undefined}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(sale._id)}
                                                onCheckedChange={() => toggleSelectRow(sale._id)}
                                            />
                                        </TableCell>
                                        <TableCell>{new Date(sale.date).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold px-2 py-1 rounded text-xs ${sale.invoice_letter === 'A' ? 'bg-indigo-100 text-indigo-700' :
                                                    sale.invoice_letter === 'B' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {sale.invoice_letter || 'X'}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium">{translatedType}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{sale.customers?.name || 'Consumidor Final'}</span>
                                                {sale.customers?.doc_number && (
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {sale.customers.doc_type || 'CUIT'}: {sale.customers.doc_number}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold font-mono">
                                            ${sale.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-bold text-slate-700 uppercase px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                                                    {sale.performer?.name || 'S/D'}
                                                </span>
                                                {(sale as any).performer?.role && (
                                                    <span className="text-[9px] font-black text-slate-400 uppercase mt-0.5 italic tracking-widest">
                                                        {(sale as any).performer.role === 'admin' ? 'Administrador' : (sale as any).performer.role}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {hasCae ? (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                                                    <CheckCircle size={12} /> Completada
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                                                    <AlertCircle size={12} /> Sin Facturar
                                                </Badge>
                                            )}
                                            {hasCae && sale.afip_data?.cae && (
                                                <div className="text-[10px] text-emerald-600 mt-1 font-mono">CAE: {sale.afip_data.cae}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Primary Action */}
                                                {!hasCae ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleFiscalize(sale)}
                                                        disabled={fiscalizingId === sale._id || isBulkFiscalizing}
                                                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-7 text-xs px-2"
                                                    >
                                                        {fiscalizingId === sale._id ? '...' : 'Fiscalizar'}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                                                        onClick={() => handlePrint(sale)}
                                                    >
                                                        <Printer size={16} />
                                                    </Button>
                                                )}

                                                {/* Dropdown Menu for More Actions */}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Abrir menú</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleWhatsApp(sale)}>
                                                            <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                                                            Enviar WhatsApp
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handlePrint(sale)}>
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            Descargar PDF
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDownloadCsv(sale)}>
                                                            <FileDown className="mr-2 h-4 w-4" />
                                                            Descargar Excel (CSV)
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredSales.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-slate-500">
                                        No se encontraron facturas en el rango seleccionado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* PAGINATION CONTROLS */}
            <div className="flex items-center justify-between p-2 mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Mostrando {((pagination?.page || 1) - 1) * (pagination?.limit || 100) + 1} a {Math.min((pagination?.page || 1) * (pagination?.limit || 100), pagination?.total || 0)} de {pagination?.total || 0} ventas (Página {pagination?.page || 1} de {pagination?.totalPages || 1})
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('page', String(Math.max(1, (pagination?.page || 1) - 1)));
                            router.push(`?${params.toString()}`);
                        }}
                        disabled={!pagination || pagination.page <= 1}
                        className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:bg-slate-50"
                    >
                        <ChevronLeft size={14} />
                    </Button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination?.totalPages || 1) }, (_, i) => {
                            const totalPages = pagination?.totalPages || 1;
                            const currentPage = pagination?.page || 1;
                            let pNum = i + 1;
                            if (totalPages > 5 && currentPage > 3) pNum = currentPage - 2 + i;
                            if (pNum > totalPages) return null;
                            if (pNum < 1) return null;

                            return (
                                <Button
                                    key={pNum}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.set('page', String(pNum));
                                        router.push(`?${params.toString()}`);
                                    }}
                                    className={cn("h-8 w-8 p-0 rounded-lg text-[10px] font-black", currentPage === pNum ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-500 hover:bg-slate-50")}
                                >
                                    {pNum}
                                </Button>
                            );
                        })}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('page', String(Math.min(pagination?.totalPages || 1, (pagination?.page || 1) + 1)));
                            router.push(`?${params.toString()}`);
                        }}
                        disabled={!pagination || pagination.page >= pagination.totalPages}
                        className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:bg-slate-50"
                    >
                        <ChevronRight size={14} />
                    </Button>
                </div>
            </div>
        </div>
    );
}

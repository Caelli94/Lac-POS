'use client'

import { useState, useTransition, useMemo, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cancelSaleAction } from '@/app/[slug]/sales/actions'
import { Printer, Eye, Ban, AlertTriangle, CheckCircle2, Search, Filter, X, ShieldCheck, ArrowRightLeft, CreditCard, Banknote, Wallet, Loader2, FileText, ChevronLeft, ChevronRight, AlertCircle, User, MoreVertical, FileDown } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { afipService } from '@/services/afipFrontendService'
import { InvoiceTemplate } from './InvoiceTemplate'
import { printTicket } from '@/utils/printTicket'

export default function SalesList({ initialSales, pagination, orgId, slug, org, ticketSettings, currentUser }: any) {
    const [sales, setSales] = useState(initialSales)

    // Permission Check
    // We check both ID (new format) and Name (legacy format) because Role Schema only saves 'name'
    const canVoidSale = currentUser?.role === 'admin' || currentUser?.roleData?.permissions?.find((p: any) => p.module === 'sales')?.tabs?.find((t: any) => t.name === 'void_sale' || t.name === 'Anular Vta.')?.enabled;
    const canViewHistory = currentUser?.role === 'admin' || currentUser?.roleData?.permissions?.find((p: any) => p.module === 'sales')?.tabs?.find((t: any) => t.name === 'history' || t.name === 'Historial')?.enabled;
    // canViewDetail: Checks for 'view_detail' or 'Ver Detalle'
    const canViewDetail = currentUser?.role === 'admin' || currentUser?.roleData?.permissions?.find((p: any) => p.module === 'sales')?.tabs?.find((t: any) => t.name === 'view_detail' || t.name === 'Ver Detalle')?.enabled;


    // Update local state when initialSales (server prop) changes
    useEffect(() => {
        setSales(initialSales)
    }, [initialSales])

    const [searchTerm, setSearchTerm] = useState('')
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const [selectedSale, setSelectedSale] = useState<any | null>(null)
    const [saleToCancel, setSaleToCancel] = useState<string | null>(null)
    const [saleToFiscalize, setSaleToFiscalize] = useState<any | null>(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [showInvoice, setShowInvoice] = useState(false)

    // Filter by Type
    const allTypes = useMemo(() => ['TICKET', 'FACTURA', 'PRESUPUESTO', 'REMITO', 'NOTA DE CRÉDITO'], []);
    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(allTypes));

    const toggleType = (type: string) => {
        const newSelected = new Set(selectedTypes);
        if (newSelected.has(type)) {
            newSelected.delete(type);
        } else {
            newSelected.add(type);
        }
        setSelectedTypes(newSelected);
    };

    // Fiscal Status Filter
    const [fiscalStatus, setFiscalStatus] = useState<string>('ALL'); // ALL, FISCALIZED, PENDING

    // Filtering
    const filteredSales = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return sales.filter((s: any) => {
            // Text Search
            // Handle customers as Object (from unwind) or Array (defensive)
            const customerName = Array.isArray(s.customers)
                ? s.customers[0]?.name
                : s.customers?.name;

            const matchesText = (s.ticket_number && s.ticket_number.toLowerCase().includes(term)) ||
                (customerName && customerName.toLowerCase().includes(term)) ||
                s.total_amount.toString().includes(term);

            // Type Filter
            let typeLabel = {
                'ticket': 'TICKET',
                'invoice': 'FACTURA',
                'quote': 'PRESUPUESTO',
                'delivery_note': 'REMITO',
                'credit_note': 'NOTA DE CRÉDITO'
            }[s.document_type as string] || 'TICKET';
            // Force invoice type mapping if letter exists
            if (s.document_type === 'invoice') typeLabel = 'FACTURA';

            const matchesType = selectedTypes.has(typeLabel);

            // Fiscal Status Filter
            let matchesFiscal = true;
            if (fiscalStatus === 'FISCALIZED') {
                matchesFiscal = !!s.afip_data?.cae;
            } else if (fiscalStatus === 'PENDING') {
                matchesFiscal = !s.afip_data?.cae && s.status !== 'cancelled';
            }

            return matchesText && matchesType && matchesFiscal;
        });
    }, [sales, searchTerm, selectedTypes, fiscalStatus]);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
    }

    const handlePrint = (sale: any) => {
        printTicket({
            organization: {
                name: ticketSettings?.business_name || org?.name || 'Mi Negocio',
                address: ticketSettings?.address || org?.address || '',
                taxId: ticketSettings?.tax_id || org?.tax_id || '',
                logoUrl: org?.logo_url,
                vatCondition: org?.afip_settings?.tax_condition || 'Responsable Inscripto',
                iibb: org?.afip_settings?.gross_income,
                startDate: org?.afip_settings?.start_activity_date ? new Date(org.afip_settings.start_activity_date).toLocaleDateString('es-AR') : undefined
            },
            sale: {
                id: sale.id,
                ticketNumber: sale.ticket_number || (sale._id ? sale._id.toString().slice(-6).toUpperCase() : '---'),
                date: sale.created_at,
                items: sale.sale_items?.map((i: any) => ({
                    name: i.product_name,
                    quantity: i.quantity,
                    price: i.unit_price,
                    variant_name: i.variant_name || i.product_variant_name
                })) || [],
                total: sale.total_amount,
                paymentMethod: sale.payment_method,
                invoiceLetter: sale.invoice_letter,
                invoiceNumber: sale.afip_data?.voucher_number ? `00000-${String(sale.afip_data.voucher_number).padStart(8, '0')}` : undefined,
                cae: sale.afip_data?.cae,
                caeExpiration: sale.afip_data?.cae_expiration,
                customer: {
                    name: sale.customers?.name || 'Cliente Final',
                    id: sale.customers?.doc_number || sale.customer_doc,
                    address: sale.customers?.address || sale.customer_address,
                    vatCondition: sale.invoice_letter === 'A' ? 'Responsable Inscripto' : 'Consumidor Final'
                },
                fiscalData: sale.fiscal_data
            },
            settings: {
                headerText: ticketSettings?.header_text,
                footerText: ticketSettings?.footer_text,
                width: (ticketSettings?.paper_width || '80mm') as '80mm' | '58mm'
            }
        });
    };

    const confirmAnulation = async () => {
        if (!saleToCancel) return;
        startTransition(async () => {
            const result = await cancelSaleAction(saleToCancel, orgId, slug);
            if (result.error) {
                toast.error(result.error);
            } else {
                setSales((prev: any) => prev.map((s: any) => s.id === saleToCancel ? { ...s, status: 'cancelled' } : s));
                setSaleToCancel(null);
                setShowSuccessModal(true);
                router.refresh();
            }
        });
    };

    const handleFiscalize = (sale: any) => {
        setSaleToFiscalize(sale);
    }

    const confirmFiscalization = async () => {
        if (!saleToFiscalize) return;
        startTransition(async () => {
            const res = await afipService.emitInvoice(saleToFiscalize.id);
            if (res.success) {
                toast.success("Factura autorizada por ARCA");
                // Update local state
                setSales((prev: any) => prev.map((s: any) => s.id === saleToFiscalize.id ? { ...s, afip_data: res.data.afip_data, invoice_letter: res.data.invoice_letter, document_type: res.data.document_type } : s));
                setSelectedSale((prev: any) => ({ ...prev, afip_data: res.data.afip_data, invoice_letter: res.data.invoice_letter, document_type: res.data.document_type }));
                setSaleToFiscalize(null);
                router.refresh();
            } else {
                toast.error(res.message);
            }
        });
    }

    // Listen for ESC key to close modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedSale(null);
                setSaleToCancel(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Filter State
    const searchParams = useSearchParams()
    const [from, setFrom] = useState(searchParams.get('from') || '')
    const [to, setTo] = useState(searchParams.get('to') || '')
    const fromRef = useRef<HTMLInputElement>(null)
    const toRef = useRef<HTMLInputElement>(null)

    const handleFilter = () => {
        if (!from && !to) {
            startTransition(() => { router.push('?') })
            return
        }

        if (!from && to) return toast.error("Seleccione Fecha Desde")
        if (from && !to) return toast.error("Seleccione Fecha Hasta")

        // Validate range (Max 2 months = approx 62 days)
        const dateFrom = new Date(from)
        const dateTo = new Date(to)
        const diffDays = Math.ceil(Math.abs(dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays > 62) return toast.error("El rango máximo de filtro es de 2 meses")
        if (dateFrom > dateTo) return toast.error("Fecha Desde no puede ser mayor a Fecha Hasta")

        startTransition(() => {
            const params = new URLSearchParams()
            params.set('from', from)
            params.set('to', to)
            router.push(`?${params.toString()}`)
        })
    }


    const financials = useMemo(() => {
        if (!selectedSale) return null;

        const subtotal = selectedSale.sale_items?.reduce((acc: number, item: any) => {
            return acc + (item.unit_price * item.quantity);
        }, 0) || 0;

        // 1. Calculate General Discount/Adjustment
        let adjustment = 0;
        if (selectedSale.discount_general) {
            const eligible = selectedSale.sale_items?.reduce((acc: number, item: any) => {
                if (item.exclude_from_general_discount) return acc;
                return acc + (item.unit_price * item.quantity);
            }, 0) || 0;

            if (selectedSale.discount_general.type === 'PERCENT') {
                adjustment = eligible * (selectedSale.discount_general.value / 100);
            } else {
                adjustment = selectedSale.discount_general.value;
            }
        }

        // 2. Calculate Customer Surcharge/Discount
        let surcharge = 0;
        if (selectedSale.surcharge_general) {
            // Priority: applied_amount (from DB) > calculated
            if (selectedSale.surcharge_general.applied_amount !== undefined) {
                surcharge = selectedSale.surcharge_general.applied_amount;
            } else {
                // Fallback calc
                const eligible = selectedSale.sale_items?.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0) || 0;
                if (selectedSale.surcharge_general.type === 'PERCENT') {
                    surcharge = eligible * (selectedSale.surcharge_general.value / 100);
                } else {
                    surcharge = selectedSale.surcharge_general.value;
                }
            }
        }

        let vatAmount = 0;
        let finalSubtotal = subtotal;

        if (selectedSale.manual_tax_added) {
            const calculated = selectedSale.sale_items?.reduce((acc: any, item: any) => {
                const taxRate = item.tax_rate ?? 0;
                const grossPrice = item.unit_price;
                const netPrice = grossPrice / (1 + taxRate / 100);
                const vatPart = grossPrice - netPrice;
                return {
                    net: acc.net + (netPrice * item.quantity),
                    vat: acc.vat + (vatPart * item.quantity)
                };
            }, { net: 0, vat: 0 }) || { net: 0, vat: 0 };

            finalSubtotal = calculated.net;
            vatAmount = calculated.vat;
        }

        return {
            subtotal: finalSubtotal,
            adjustment,
            surcharge,
            vatAmount,
            rounding: selectedSale.rounding_difference || 0,
            total: selectedSale.total_amount
        };
    }, [selectedSale]);
    // ... (omitted hook deps/render)

    // ... INSIDE RENDER (lines 696-703 approx) ... we need to replace the conditional rows

    // Replacing the rows in TFOOT. 
    // Note: The previous view showed separate blocks for discount and rounding. 
    // I will replace the Discount block and ADD the Surcharge block.
    // To do this cleanly with replace_file_content, I'll need to target the Rows.
    // But financials hook is earlier. 
    // I will use `multi_replace_file_content` via separate calls or `replace_file_content` for hook first?
    // Wait, I can't use multi in one turn effectively if I want to be safe.
    // I'll do 2 edits. 
    // First edit: Update `financials` definition (lines 225-252).







    const clearFilter = () => {
        setSearchTerm('')
        setSelectedTypes(new Set(allTypes))
        setFrom('')
        setTo('')
        startTransition(() => { router.push('?') })
    }

    return (
        <div className="w-full">
            {/* SUCCESS MODAL FOR CANCELLATION */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader className="hidden">
                        <DialogTitle>Venta Anulada Exitosamente</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">¡Venta Anulada!</h2>
                        <p className="text-sm text-slate-500 font-medium">
                            La operación ha sido revertida correctamente.
                            <br />El stock y la caja/cuenta han sido actualizados.
                        </p>
                        <Button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold uppercase tracking-wide mt-4"
                        >
                            Entendido
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* INVOICE VIEWER DIALOG */}
            <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
                <DialogContent className="max-w-[850px] bg-slate-100 p-0 overflow-y-auto max-h-[90vh]">
                    <div className="sticky top-0 z-10 bg-white p-4 border-b flex justify-between items-center shadow-sm">
                        <h3 className="font-bold text-lg uppercase">Vista Previa de Factura</h3>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowInvoice(false)}>Cerrar</Button>
                            <Button onClick={() => {
                                const printContent = document.getElementById('printable-invoice');
                                const windowUrl = 'about:blank';
                                const uniqueName = new Date().getTime();
                                const windowName = 'Print' + uniqueName;
                                const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

                                if (printWindow && printContent) {
                                    printWindow.document.write(`
                                         <html>
                                             <head>
                                                 <title>Imprimir Factura</title>
                                                 <script src="https://cdn.tailwindcss.com"></script>
                                                 <style>
                                                     @media print {
                                                         @page { size: A4; margin: 0; }
                                                         body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                                                     }
                                                 </style>
                                             </head>
                                             <body>
                                                 ${printContent.outerHTML}
                                                 <script>
                                                     setTimeout(() => {
                                                         window.print();
                                                         window.close();
                                                     }, 500);
                                                 </script>
                                             </body>
                                         </html>
                                     `);
                                    printWindow.document.close();
                                }
                            }}>
                                <Printer size={16} className="mr-2" /> Imprimir
                            </Button>
                        </div>
                    </div>
                    <div className="flex justify-center p-8 bg-slate-100">
                        {selectedSale && <InvoiceTemplate sale={selectedSale} org={org} />}
                    </div>
                </DialogContent>
            </Dialog>

            {/* CONFIRMATION MODAL (CANCEL SALE) */}
            <Dialog open={!!saleToCancel} onOpenChange={(o) => { if (!o) setSaleToCancel(null) }}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center text-slate-900">¿ANULAR VENTA?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-destructive mb-2">
                            <AlertTriangle size={32} />
                        </div>
                        <p className="text-sm text-slate-500 font-medium">
                            Esta acción revertirá stock y caja.
                        </p>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button
                                variant="outline"
                                onClick={() => setSaleToCancel(null)}
                                className="rounded-xl h-12 font-bold uppercase text-[10px]"
                                disabled={isPending}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmAnulation}
                                className="bg-destructive hover:bg-red-700 text-white rounded-xl h-12 font-black uppercase text-[10px] shadow-lg shadow-red-200"
                                disabled={isPending}
                            >
                                {isPending ? 'Procesando...' : 'Sí, Anular'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>


            {/* FILTERS CONTAINER */}
            <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-4">

                {/* FISCALIZATION CONFIRMATION MODAL (Updated Style) */}
                <Dialog open={!!saleToFiscalize} onOpenChange={(o) => { if (!o) setSaleToFiscalize(null) }}>
                    <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center text-slate-900">¿FACTURAR EN ARCA?</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-2">
                                <ShieldCheck size={32} />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">
                                Se generará un comprobante fiscal válido.
                                <br />Esta acción impacta en AFIP/ARCA.
                            </p>
                            <div className="w-full grid grid-cols-2 gap-3 mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setSaleToFiscalize(null)}
                                    className="rounded-xl h-12 font-bold uppercase text-[10px]"
                                    disabled={isPending}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={confirmFiscalization}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 font-black uppercase text-[10px] shadow-lg shadow-indigo-200"
                                    disabled={isPending}
                                >
                                    {isPending ? 'Procesando...' : 'Sí, Facturar'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* SEARCH */}
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 flex-1 max-w-md">
                    <div className="px-3 h-9 bg-slate-200 rounded-lg flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase border border-slate-300">
                        <Search size={14} /> BUSCAR
                    </div>
                    <Input
                        placeholder="N° Ticket o Cliente..."
                        className="bg-transparent border-0 focus-visible:ring-0 text-slate-900 text-sm h-9 shadow-none flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* TYPE FILTERS */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Filter size={10} /> Tipos:</div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[140px] justify-between shadow-sm focus:ring-2 focus:ring-primary/20 hover:bg-slate-50">
                                <span className="mr-2">Seleccionar</span>
                                <Badge variant="secondary" className="h-5 px-1.5 bg-slate-100 text-slate-600 font-bold text-[9px] rounded-md border border-slate-200">
                                    {selectedTypes.size}
                                </Badge>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 p-1">
                            <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase px-2 py-1.5">Filtrar por tipo</DropdownMenuLabel>
                            <DropdownMenuSeparator className="-mx-1 my-1" />
                            <div className="space-y-0.5">
                                {allTypes.map((type) => (
                                    <DropdownMenuItem
                                        key={type}
                                        onSelect={(e) => { e.preventDefault(); toggleType(type); }}
                                        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer focus:bg-slate-50 rounded-md"
                                    >
                                        <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                id={`filter-${type}`}
                                                checked={selectedTypes.has(type)}
                                                onCheckedChange={() => toggleType(type)}
                                                className="data-[state=checked]:text-white"
                                            />
                                            <label
                                                htmlFor={`filter-${type}`}
                                                className="text-[10px] font-bold uppercase text-slate-700 cursor-pointer flex-1 leading-none select-none"
                                                onClick={() => toggleType(type)}
                                            >
                                                {type}
                                            </label>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="w-px h-8 bg-slate-200 mx-2 hidden md:block"></div>

                {/* FISCAL STATUS FILTER */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><ShieldCheck size={10} /> Fiscal:</div>
                    <select
                        value={fiscalStatus}
                        onChange={(e) => setFiscalStatus(e.target.value)}
                        className="bg-transparent border-none text-[10px] font-bold uppercase text-slate-700 focus:ring-0 h-9 pr-8 cursor-pointer outline-none"
                    >
                        <option value="ALL">Todos</option>
                        <option value="FISCALIZED">Fiscalizados</option>
                        <option value="PENDING">Pendientes</option>
                    </select>
                </div>

                <div className="w-px h-8 bg-slate-200 mx-2 hidden md:block"></div>

                {/* DATE FILTERS */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 cursor-pointer" onClick={() => fromRef.current?.showPicker()}>
                        <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">Desde:</div>
                        <input ref={fromRef} type="date" value={from} onChange={(e) => setFrom(e.target.value)} onClick={(e) => e.stopPropagation()} className="bg-transparent border-none text-[10px] font-bold uppercase text-slate-700 focus:ring-0 h-9 [&::-webkit-calendar-picker-indicator]:hidden" />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 ml-2 cursor-pointer" onClick={() => toRef.current?.showPicker()}>
                        <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">Hasta:</div>
                        <input ref={toRef} type="date" value={to} onChange={(e) => setTo(e.target.value)} onClick={(e) => e.stopPropagation()} className="bg-transparent border-none text-[10px] font-bold uppercase text-slate-700 focus:ring-0 h-9 [&::-webkit-calendar-picker-indicator]:hidden" />
                    </div>
                    <Button onClick={handleFilter} disabled={isPending} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl shadow-none ml-2">
                        <Filter className="mr-2 h-3 w-3" /> Filtrar
                    </Button>
                </div>

                <div className="ml-auto">
                    {(searchTerm || selectedTypes.size !== allTypes.length || searchParams.get('from') || searchParams.get('to') || fiscalStatus !== 'ALL') && (
                        <Button onClick={clearFilter} variant="ghost" disabled={isPending} className="text-slate-500 hover:text-red-600 font-bold uppercase text-[10px] px-4 h-10 tracking-widest rounded-xl hover:bg-red-50 ml-2">
                            <X className="mr-2 h-3 w-3" /> Limpiar
                        </Button>
                    )}

                </div>
            </div>

            {/* TABLE CONTAINER */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mb-4">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-slate-100 italic font-medium uppercase">
                                <TableHead className="text-[10px] text-slate-400">Fecha/Hora</TableHead>
                                <TableHead className="text-[10px] text-slate-400">Cliente / Detalles</TableHead>
                                <TableHead className="text-[10px] text-slate-400">Tipo</TableHead>
                                <TableHead className="text-[10px] text-slate-400 text-center">Origen</TableHead>
                                <TableHead className="text-[10px] text-slate-400 text-center">Operador</TableHead>
                                <TableHead className="text-[10px] text-slate-400">Método</TableHead>
                                <TableHead className="w-[100px] text-[10px] text-slate-400">Estado</TableHead>
                                <TableHead className="text-[10px] text-slate-400 text-right">Efectivo</TableHead>
                                <TableHead className="text-[10px] text-slate-400 text-right">Digital</TableHead>
                                <TableHead className="text-[10px] text-slate-400 text-right">Total</TableHead>
                                <TableHead className="w-[100px] text-[10px] text-slate-400 text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPending && (
                                <TableRow key="loading-history">
                                    <TableCell colSpan={9} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2 text-slate-400">
                                            <Loader2 size={16} className="animate-spin" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Actualizando historial...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {!isPending && (!filteredSales || filteredSales.length === 0) && (
                                <TableRow key="no-sales-found">
                                    <TableCell colSpan={9} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                                <AlertCircle size={24} />
                                            </div>
                                            <p className="text-[11px] font-black uppercase tracking-tight">No se encontraron ventas para este periodo</p>
                                            <p className="text-[9px] font-medium italic">Intenta ajustar los filtros de fecha o búsqueda.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {!isPending && filteredSales && filteredSales.map((sale: any, idx: number) => {
                                // Calculate Cash vs Digital
                                let amountCash = 0;
                                let amountDigital = 0;
                                let methodLabel = 'Varios';

                                if (sale.payments && sale.payments.length > 0) {
                                    const uniqueMethods = new Set<string>();
                                    sale.payments.forEach((p: any) => {
                                        const m = p.method;
                                        if (m === 'cash') amountCash += p.amount;
                                        else amountDigital += p.amount;
                                        uniqueMethods.add(m);
                                    });
                                    if (uniqueMethods.size === 1) {
                                        const m = Array.from(uniqueMethods)[0];
                                        methodLabel = m === 'cash' ? 'Efectivo' :
                                            m === 'card' || m === 'credit_card' || m === 'debit_card' ? 'Tarjeta' :
                                                m === 'transfer' ? 'Transf.' :
                                                    m === 'ACCOUNT' ? 'Cta.Cte.' : m;
                                    } else if (uniqueMethods.size > 1) {
                                        methodLabel = 'Mixto';
                                    }
                                } else {
                                    amountCash = sale.total_amount;
                                    methodLabel = 'Efectivo';
                                }

                                return (
                                    <TableRow key={sale._id || sale.id || idx} className={cn("group hover:bg-slate-50/50 border-slate-100 transition-colors", sale.status === 'cancelled' && "opacity-40 grayscale line-through decoration-slate-400")}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700">
                                                    {new Date(sale.date || sale.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] font-medium text-slate-400 italic">
                                                    {new Date(sale.date || sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}hs
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:border-slate-300 transition-all">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                                                            {sale.customers?.name || 'Cliente Final'}
                                                        </span>
                                                        {sale.ticket_number && (
                                                            <span className="text-[9px] bg-slate-100 px-1 rounded font-mono text-slate-500 border border-slate-200">
                                                                #{sale.ticket_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        {sale.sale_items?.length || 0} ítems — {sale.customers?.phone || '---'}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <Badge variant="outline" className="text-[10px] uppercase font-black h-6 px-2 border-slate-200 bg-white shadow-sm text-slate-600">
                                                {sale.invoice_letter ? `FACTURA ${sale.invoice_letter}` : 'TICKET'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center py-3">
                                            {(() => {
                                                const source = sale.source || 'local';
                                                const config = {
                                                    local: { label: 'Local', color: 'bg-slate-50 text-slate-500 border-slate-200' },
                                                    tiendanube: { label: 'Tienda Nube', color: 'bg-blue-50 text-blue-600 border-blue-200' },
                                                    wix: { label: 'Wix', color: 'bg-purple-50 text-purple-600 border-purple-200' }
                                                }[source as 'local' | 'tiendanube' | 'wix'] || { label: 'Otro', color: 'bg-slate-50 text-slate-500 border-slate-200' };

                                                return (
                                                    <Badge variant="outline" className={cn("text-[9px] uppercase font-black px-1.5 h-5 rounded-md", config.color)}>
                                                        {config.label}
                                                    </Badge>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-center py-3">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-bold text-slate-700 uppercase px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                                                    {sale.performer?.name || 'S/D'}
                                                </span>
                                                {sale.performer?.role && (
                                                    <span className="text-[9px] font-black text-slate-400 uppercase mt-0.5 italic tracking-widest leading-none">
                                                        {sale.performer.role === 'admin' ? 'Administrador' : sale.performer.role}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs uppercase font-bold text-slate-500 py-3">
                                            {(() => {
                                                const m = (methodLabel || '').toUpperCase();
                                                if (m === 'MIXTO') return 'Mixto';
                                                if (m.includes('CARD') || m.includes('TARJETA')) return 'Tarjeta';
                                                if (m.includes('TRANSFER') || m.includes('TRANSF')) return 'Transf.';
                                                if (m.includes('ACCOUNT') || m.includes('CTA')) return 'Cta.Cte.';
                                                if (m.includes('CASH') || m.includes('EFECTIVO')) return 'Efectivo';
                                                return methodLabel;
                                            })()}
                                        </TableCell>
                                        <TableCell className="py-3">
                                            {sale.status === 'cancelled' ? (
                                                <Badge variant="outline" className="h-5 px-1.5 uppercase text-[9px] font-black tracking-tighter border-red-200 bg-red-50 text-red-500 rounded-lg flex items-center gap-1 w-fit">
                                                    ANULADO
                                                </Badge>
                                            ) : sale.afip_data?.cae ? (
                                                <Badge variant="outline" className="h-5 px-1.5 uppercase text-[9px] font-black tracking-tighter border-emerald-200 bg-emerald-50 text-emerald-500 rounded-lg flex items-center gap-1 w-fit">
                                                    FISCALIZADA
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="h-5 px-1.5 uppercase text-[9px] font-black tracking-tighter border-amber-200 bg-amber-50 text-amber-600 rounded-lg flex items-center gap-1 w-fit">
                                                    PENDIENTE
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm py-3 text-emerald-600 font-bold">
                                            {amountCash > 0 ? formatMoney(amountCash) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm py-3 text-blue-600 font-bold">
                                            {amountDigital > 0 ? formatMoney(amountDigital) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right py-3">
                                            <span className="text-sm font-black text-slate-900 tracking-tight">
                                                {formatMoney(sale.total_amount)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right py-2">
                                            <div className="flex justify-end gap-1">
                                                {canViewDetail && (
                                                    <button onClick={() => setSelectedSale(sale)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600">
                                                        <Eye size={14} />
                                                    </button>
                                                )}
                                                <button onClick={() => handlePrint(sale)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900">
                                                    <Printer size={14} />
                                                </button>
                                                {org?.afip_settings?.enabled && !sale.afip_data?.cae && sale.status !== 'cancelled' && (
                                                    <button onClick={() => handleFiscalize(sale)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-purple-600">
                                                        <FileDown size={14} />
                                                    </button>
                                                )}
                                                {sale.status !== 'cancelled' && canVoidSale && (
                                                    <button onClick={() => setSaleToCancel(sale)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600">
                                                        <Ban size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div >
            </div >

            {/* PAGINATION CONTROLS */}
            < div className="flex items-center justify-between p-2" >
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Mostrando {((pagination?.page || 1) - 1) * (pagination?.limit || 50) + 1} a {Math.min((pagination?.page || 1) * (pagination?.limit || 50), pagination?.total || 0)} de {pagination?.total || 0} ventas (Página {pagination?.page || 1} de {pagination?.totalPages || 1})
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:bg-slate-50"
                        disabled={!pagination || pagination.page <= 1 || isPending}
                        onClick={() => {
                            startTransition(() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.set('page', String((pagination?.page || 1) - 1));
                                router.push(`?${params.toString()}`);
                            });
                        }}
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
                                        startTransition(() => {
                                            const params = new URLSearchParams(searchParams.toString());
                                            params.set('page', String(pNum));
                                            router.push(`?${params.toString()}`);
                                        });
                                    }}
                                    className={cn("h-8 w-8 p-0 rounded-lg text-[10px] font-black", currentPage === pNum ? "bg-slate-900 text-white" : "text-slate-500")}
                                >
                                    {pNum}
                                </Button>
                            );
                        })}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:bg-slate-50"
                        disabled={!pagination || pagination.page >= pagination.totalPages || isPending}
                        onClick={() => {
                            startTransition(() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.set('page', String((pagination?.page || 1) + 1));
                                router.push(`?${params.toString()}`);
                            });
                        }}
                    >
                        <ChevronRight size={14} />
                    </Button>
                </div>
            </div >

            {selectedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-semibold text-lg">Detalle de Venta</h3>
                            <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="mb-4 flex justify-between items-start gap-4">
                                <div className="text-sm text-slate-600 space-y-1">
                                    <p><strong>Fecha:</strong> {new Date(selectedSale.date || selectedSale.created_at).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                                    <p><strong>Cliente:</strong> {selectedSale.customers?.name || 'Cliente Final'}</p>
                                    <p><strong>Comprobante:</strong> {selectedSale.invoice_letter === 'A' ? 'Factura A' : selectedSale.invoice_letter === 'B' ? 'Factura B' : 'Ticket'}</p>
                                    <p><strong>N° Ticket:</strong> {selectedSale.ticket_number || '---'}</p>

                                    {/* AFIP DATA */}
                                    {/* AFIP DATA & ACTIONS */}
                                    {selectedSale.afip_data?.cae ? (
                                        <div className="mt-2 space-y-2">
                                            <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-lg flex items-center gap-2">
                                                <ShieldCheck className="text-indigo-600" size={16} />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-indigo-600">Comprobante Fiscal Autorizado</p>
                                                    <p className="text-xs font-mono text-indigo-800">CAE: {selectedSale.afip_data.cae}</p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => setShowInvoice(true)}
                                                variant="outline"
                                                size="sm"
                                                className="w-full h-8 text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 uppercase"
                                            >
                                                <Printer size={14} className="mr-2" /> Ver / Imprimir Factura
                                            </Button>
                                        </div>
                                    ) : (
                                        selectedSale.status !== 'cancelled' && org?.afip_settings?.enabled && (
                                            <Button onClick={() => handleFiscalize(selectedSale)} size="sm" variant="outline" className="mt-2 h-8 text-xs border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold">
                                                <FileText size={14} className="mr-2" /> Fiscalizar (ARCA)
                                            </Button>
                                        )
                                    )}
                                </div>
                                {selectedSale.status === 'cancelled' && (
                                    <div className="border-2 border-dashed border-red-200 bg-red-50 text-red-500 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-sm text-center">
                                        Anulado / Cancelado
                                    </div>
                                )}
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                                    <tr>
                                        <th className="px-4 py-3 text-left w-1/4">Producto</th>
                                        <th className="px-4 py-3 text-left w-1/5">Proveedor</th>
                                        <th className="px-4 py-3 text-left w-1/5">Rubros</th>
                                        <th className="px-4 py-3 text-center">Cant.</th>
                                        <th className="px-4 py-3 text-right">Unitario</th>
                                        <th className="px-4 py-3 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedSale.sale_items?.map((item: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-3 text-slate-700 font-medium align-top">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{item.product_name}</span>
                                                    {(item.variant_name || item.product_variant_name) && (
                                                        <span className="text-[10px] text-indigo-600 font-black uppercase mt-0.5">
                                                            {item.variant_name || item.product_variant_name}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-400 font-mono">{item.product_details?.sku || ''}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top text-xs text-slate-600">{item.product_details?.supplier?.name || '---'}</td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-wrap gap-1">
                                                    {item.product_details?.categories?.map((c: any) => (
                                                        <span key={c._id} className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded border border-slate-200">{c.name}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-400 align-top">x{item.quantity}</td>
                                            <td className="px-4 py-3 text-right text-slate-500 align-top">{formatMoney(item.unit_price)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-700 align-top">{formatMoney(item.unit_price * item.quantity)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t">
                                    <tr>
                                        <td colSpan={5} className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Subtotal</td>
                                        <td className="px-4 py-2 text-right text-slate-700 font-bold">
                                            {formatMoney(financials?.subtotal || 0)}
                                        </td>
                                    </tr>
                                    {financials && Math.abs(financials.adjustment) >= 0.01 && (
                                        <tr>
                                            <td colSpan={5} className={`px-4 py-2 text-right text-xs font-bold uppercase ${financials.adjustment > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {financials.adjustment > 0 ? 'Recargo' : 'Descuento General'} {selectedSale.discount_general?.type === 'PERCENT' ? `(${Math.abs(selectedSale.discount_general.value)}%)` : ''}
                                            </td>
                                            <td className={`px-4 py-2 text-right font-bold ${financials.adjustment > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {financials.adjustment > 0 ? '+' : ''}{formatMoney(financials.adjustment)}
                                            </td>
                                        </tr>
                                    )}
                                    {financials && Math.abs(financials.surcharge) >= 0.01 && (
                                        <tr>
                                            <td colSpan={5} className={`px-4 py-2 text-right text-xs font-bold uppercase ${financials.surcharge > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                {financials.surcharge > 0 ? 'Recargo Cliente' : 'Descuento Cliente'} {selectedSale.surcharge_general?.type === 'PERCENT' ? `(${Math.abs(selectedSale.surcharge_general.value)}%)` : ''}
                                            </td>
                                            <td className={`px-4 py-2 text-right font-bold ${financials.surcharge > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                {financials.surcharge > 0 ? '+' : ''}{formatMoney(financials.surcharge)}
                                            </td>
                                        </tr>
                                    )}
                                    {financials && financials.vatAmount > 0.01 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-2 text-right text-xs font-bold text-blue-600 uppercase">IVA Agregado</td>
                                            <td className="px-4 py-2 text-right text-blue-600 font-bold">
                                                +{formatMoney(financials.vatAmount)}
                                            </td>
                                        </tr>
                                    )}
                                    {financials && Math.abs(financials.rounding) >= 0.01 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Redondeo</td>
                                            <td className="px-4 py-2 text-right text-slate-700 font-bold">
                                                {financials.rounding > 0 ? '+' : ''}{formatMoney(financials.rounding)}
                                            </td>
                                        </tr>
                                    )}
                                    {selectedSale.invoice_letter === 'A' && selectedSale.fiscal_data && (() => {
                                        const total = financials?.total || 0;
                                        const safeNet = (selectedSale.fiscal_data.net_amount && !isNaN(selectedSale.fiscal_data.net_amount)) ? selectedSale.fiscal_data.net_amount : (total / 1.21);
                                        const safeVat = (selectedSale.fiscal_data.vat_amount && !isNaN(selectedSale.fiscal_data.vat_amount)) ? selectedSale.fiscal_data.vat_amount : (total - safeNet);
                                        return (
                                            <>
                                                <tr className="border-t border-slate-100">
                                                    <td colSpan={5} className="px-4 py-1 text-right text-xs font-bold text-purple-600 uppercase">Neto Gravado (21%)</td>
                                                    <td className="px-4 py-1 text-right text-purple-600 font-bold">{formatMoney(safeNet)}</td>
                                                </tr>
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-1 text-right text-xs font-bold text-purple-600 uppercase">IVA (21%)</td>
                                                    <td className="px-4 py-1 text-right text-purple-600 font-bold">{formatMoney(safeVat)}</td>
                                                </tr>
                                            </>
                                        )
                                    })()}
                                    <tr className="border-t border-slate-200">
                                        <td colSpan={5} className="px-4 py-3 text-right text-sm font-black text-slate-900 uppercase">Total Final</td>
                                        <td className="px-4 py-3 text-right text-indigo-600 text-xl font-black">{formatMoney(financials?.total || 0)}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Payment Methods Breakdown */}
                            <div className="mt-6 border-t pt-6">
                                <h4 className="text-xs font-black uppercase text-slate-500 mb-3">Métodos de Pago</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {selectedSale.payments?.map((p: any, idx: number) => {
                                        const map: any = {
                                            'cash': { label: 'Efectivo', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                            'credit_card': { label: 'Crédito', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
                                            'debit_card': { label: 'Débito', icon: CreditCard, color: 'text-pink-600', bg: 'bg-pink-50' },
                                            'transfer': { label: 'Transferencia', icon: ArrowRightLeft, color: 'text-blue-600', bg: 'bg-blue-50' },
                                            'check': { label: 'Cheque', icon: Banknote, color: 'text-orange-600', bg: 'bg-orange-50' },
                                            'ACCOUNT': { label: 'Cta. Cte.', icon: Wallet, color: 'text-slate-600', bg: 'bg-slate-100' }
                                        };
                                        const info = map[p.method] || { label: p.method, icon: Wallet, color: 'text-slate-600', bg: 'bg-slate-50' };
                                        const Icon = info.icon;
                                        if (p.method === 'card') { info.label = 'Tarjeta'; info.color = 'text-purple-600'; }
                                        return (
                                            <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border border-slate-100 ${info.bg}`}>
                                                <Icon className={`w-5 h-5 ${info.color}`} />
                                                <div>
                                                    <p className={`text-[10px] font-bold uppercase ${info.color} opacity-80`}>{info.label}</p>
                                                    <p className="font-bold text-slate-900">{formatMoney(p.amount)}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <Button onClick={() => handlePrint(selectedSale)} className="w-full mt-6 bg-slate-900 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2">
                                <Printer size={18} /> Reimprimir Ticket
                            </Button>
                        </div>
                    </div>
                </div>
            )
            }

            {
                saleToCancel && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-sm p-6 text-center">
                            <AlertTriangle className="mx-auto h-12 w-12 text-red-600 mb-4" />
                            <h3 className="text-lg font-bold mb-2">¿Anular esta venta?</h3>
                            <p className="text-sm text-slate-500 mb-6 italic">El stock será devuelto automáticamente.</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setSaleToCancel(null)} className="px-4 py-2 border rounded-lg w-full transition-all hover:bg-slate-50">Cancelar</button>
                                <button onClick={confirmAnulation} disabled={isPending} className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg w-full flex justify-center items-center">
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showSuccessModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                            <div className="mx-auto h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold mb-2 text-emerald-700">¡Venta Anulada!</h3>
                            <p className="text-sm text-slate-500 mb-6">El stock ha sido devuelto al inventario correctamente.</p>
                            <button onClick={() => setShowSuccessModal(false)} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg w-full">
                                Entendido
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
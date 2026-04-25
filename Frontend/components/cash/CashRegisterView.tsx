'use client'

import React, { useState, useMemo, useTransition, useEffect, useRef } from 'react'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    Search, Plus, Eye, Wallet, ArrowUpRight, ArrowDownRight, CalendarDays,
    Loader2, AlertTriangle, History, Ban, CheckCircle2, X, Printer, ArrowLeft, Ticket,
    Banknote, CreditCard, ArrowRightLeft, Filter, ShieldCheck, WifiOff
} from 'lucide-react'
import { printTicket } from '@/utils/printTicket'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toast } from 'sonner'
import { cn } from "@/lib/utils"
import { cancelSaleAction } from '@/app/[slug]/sales/actions'
import { registerCashMovement, closeCashRegister, openCashRegister, getSessionDetails, voidCashMovement } from '@/app/[slug]/pos/cash-actions'

interface CashRegisterProps {
    initialRegister: any;
    activeSession: any;
    initialSales: any[];
    initialManualMovements: any[];
    initialHistory: any[];
    org: any;
    ticketSettings: any;
    orgId: string;
    slug: string;
    dateRange: { from: string, to: string };
    historyDateRange?: { from: string, to: string };
    allRegisters?: any[];
    allBranches?: any[];
    currentUser?: any;
}

export default function CashRegisterView({
    initialRegister,
    activeSession,
    initialSales = [],
    initialManualMovements = [],
    initialHistory = [],
    org,
    ticketSettings,
    orgId,
    slug,
    dateRange,
    historyDateRange,
    allRegisters = [],
    allBranches = [],
    currentUser
}: CashRegisterProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const canVoidSale = currentUser?.role === 'admin' || currentUser?.roleData?.permissions?.find((p: any) => p.module === 'sales')?.tabs?.find((t: any) => t.name === 'void_sale' || t.name === 'Anular Vta.')?.enabled;
    const canVoidMovement = currentUser?.role === 'admin' || currentUser?.roleData?.permissions?.find((p: any) => p.module === 'cash')?.tabs?.find((t: any) => t.name === 'void_movement' || t.name === 'Anular Mov.')?.enabled;
    const canCreateMovement = currentUser?.role === 'admin' || currentUser?.roleData?.permissions?.find((p: any) => p.module === 'cash')?.tabs?.find((t: any) => t.name === 'movements' || t.name === 'Movimientos')?.enabled;
    const canCloseShift = currentUser?.role === 'admin' || currentUser?.roleData?.permissions?.find((p: any) => p.module === 'cash')?.tabs?.find((t: any) => t.name === 'closure' || t.name === 'Cierre')?.enabled;
    const canViewDetail = currentUser?.role === 'admin' || currentUser?.roleData?.permissions?.find((p: any) => p.module === 'cash')?.tabs?.find((t: any) => t.name === 'view_detail' || t.name === 'Ver Detalle')?.enabled;
    const canViewHistory = currentUser?.role === 'admin' || currentUser?.roleData?.permissions?.find((p: any) => p.module === 'cash')?.tabs?.find((t: any) => t.name === 'history' || t.name === 'Historial')?.enabled;

    const [searchTerm, setSearchTerm] = useState('')

    // History Filter State
    const [historyFrom, setHistoryFrom] = useState(historyDateRange?.from || '');
    const [historyTo, setHistoryTo] = useState(historyDateRange?.to || '');
    // URL Params for filters (read from current URL or default empty)
    // Actually we should get them from props or useSearchParams, but props are easier if passed.
    // Let's assume passed via separate props or we parse URL? 
    // Simplified: Just local state, on trigger push URL.
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [selectedRegister, setSelectedRegister] = useState<string>('');

    const handleHistoryFilter = () => {
        if (!historyFrom || !historyTo) return toast.error("Seleccione fechas");
        startTransition(() => {
            const params = new URLSearchParams();
            params.set('hFrom', historyFrom);
            params.set('hTo', historyTo);
            if (activeTab === 'Turnos Hoy') {
                params.set('from', dateRange.from);
                params.set('to', dateRange.to);
            }
            if (selectedBranch && selectedBranch !== 'all') params.set('branch_id', selectedBranch);
            if (selectedRegister && selectedRegister !== 'all') params.set('register_id', selectedRegister);

            router.push(`?${params.toString()}`);
        });
    };


    // Date State (synced with URL/Props)
    const [dates, setDates] = useState({
        from: dateRange?.from || format(new Date(), 'yyyy-MM-dd'),
        to: dateRange?.to || format(new Date(), 'yyyy-MM-dd')
    });
    const fromRef = useRef<HTMLInputElement>(null);
    const toRef = useRef<HTMLInputElement>(null);
    const historyFromRef = useRef<HTMLInputElement>(null);
    const historyToRef = useRef<HTMLInputElement>(null);

    // Update state if props change
    useEffect(() => {
        if (dateRange) {
            setDates({
                from: dateRange.from,
                to: dateRange.to
            })
        }
    }, [dateRange]);

    const handleDateChange = (field: 'from' | 'to', value: string) => {
        const newDates = { ...dates, [field]: value };
        setDates(newDates); // Optimistic update

        // Validation: Max 31 days
        const d1 = new Date(newDates.from);
        const d2 = new Date(newDates.to);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 32) {
            toast.error("El rango máximo es de 1 mes.");
            return;
        }

        // Push to URL
        startTransition(() => {
            router.push(`?from=${newDates.from}&to=${newDates.to}&hFrom=${newDates.from}&hTo=${newDates.to}`);
        });
    };

    // Estados de UI
    const [selectedMovement, setSelectedMovement] = useState<any | null>(null)
    const [activeBox, setActiveBox] = useState<'ingresos' | 'egresos' | 'neto' | 'manual' | 'abrir' | 'global' | null>(null)
    const [activeTab, setActiveTab] = useState<'Turnos Hoy' | 'Historial'>('Turnos Hoy')
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Filter by Type
    const allTypes = useMemo(() => ['TICKET', 'FACTURA', 'NOTA DE CRÉDITO', 'PRESUPUESTO', 'REMITO', 'INGRESO', 'EGRESO'], []);
    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(allTypes));
    const [cashierName, setCashierName] = useState('');
    const [shiftName, setShiftName] = useState('');

    const toggleType = (type: string) => {
        const newSet = new Set(selectedTypes);
        if (newSet.has(type)) newSet.delete(type);
        else newSet.add(type);
        setSelectedTypes(newSet);
    };

    // Group History by Day
    const groupedHistory = useMemo(() => {
        const groups: Record<string, any[]> = {};
        (initialHistory || []).forEach(session => {
            const dateParams = session.openedAt || session.created_at;
            if (!dateParams) return;
            const dateKey = format(new Date(dateParams), 'yyyy-MM-dd');
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(session);
        });
        // Sort keys desc
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [initialHistory]);

    // Estados de Procesos
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [viewingSession, setViewingSession] = useState<any | null>(null)
    const [historyDetail, setHistoryDetail] = useState<{ sales: any[], movements: any[] } | null>(null)
    const [selectedSale, setSelectedSale] = useState<any | null>(null)

    // Estados de Procesos
    const [realCash, setRealCash] = useState('')
    const [closingInitialControl, setClosingInitialControl] = useState('')
    const [openingAmount, setOpeningAmount] = useState('')
    const [closeComment, setCloseComment] = useState('')
    const [saleToCancel, setSaleToCancel] = useState<string | null>(null)
    const [movementToVoid, setMovementToVoid] = useState<any | null>(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [voiding, setVoiding] = useState(false) // State for void loading

    const formatMoney = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)
    const isRegisterOpen = activeSession?.status === 'open';

    // Global ESC handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedMovement(null);
                setSelectedSale(null);
                setActiveBox(null);
                setSaleToCancel(null);
                setShowSuccessModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // --- LÓGICA DE HISTORIAL ---
    const handleViewHistorySession = async (session: any) => {
        setLoadingHistory(true);
        setViewingSession(session);
        try {
            const res = await getSessionDetails(session.id);
            setHistoryDetail(res);
        } catch (error) {
            toast.error("No se pudo cargar el detalle del turno");
        } finally {
            setLoadingHistory(false);
        }
    };

    // --- LÓGICA DE IMPRESIÓN ---
    const handlePrint = (mov: any) => {
        // Normalization for specific manual movement vs sale structure
        const isManual = mov.sessionId && !mov.ticket_number && !mov.documentType;

        printTicket({
            organization: {
                name: ticketSettings?.business_name || org?.name || 'Mi Negocio',
                address: ticketSettings?.address || org?.address || '',
                taxId: ticketSettings?.tax_id || org?.tax_id || '',
                logoUrl: org?.logo_url,
                vatCondition: org?.afip_settings?.tax_condition,
                iibb: org?.afip_settings?.gross_income,
                startDate: org?.afip_settings?.start_activity_date ? new Date(org.afip_settings.start_activity_date).toLocaleDateString('es-AR') : undefined
            },
            sale: {
                id: mov.id,
                ticketNumber: mov.ticket_number || (mov.id ? mov.id.toString().slice(-6).toUpperCase() : '---'),
                date: mov.date,
                items: (mov.items || mov.sale_items || []).map((i: any) => ({
                    name: i.product_name || i.description || 'Item',
                    quantity: i.quantity || 1,
                    price: i.unit_price || i.amount || 0
                })),
                total: mov.amount !== undefined ? mov.amount : (mov.total_amount || 0),
                paymentMethod: mov.method || mov.payment_method || 'Efectivo',
                invoiceLetter: mov.invoice_letter,
                invoiceNumber: mov.afip_data?.voucher_number ? `00000-${String(mov.afip_data.voucher_number).padStart(8, '0')}` : undefined,
                cae: mov.afip_data?.cae,
                caeExpiration: mov.afip_data?.cae_expiration,
                customer: {
                    name: mov.customer || 'Consumidor Final',
                    id: undefined,
                    address: undefined
                }
            },
            settings: {
                headerText: ticketSettings?.header_text,
                footerText: ticketSettings?.footer_text,
                width: (ticketSettings?.paper_width || '80mm') as '80mm' | '58mm'
            }
        });
    };
    const handlePrintOld = (mov: any) => {
        const width = ticketSettings?.paper_width === '58mm' ? '219px' : '302px';
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // XML/Data Normalization
        const items = mov.items || mov.sale_items || [];
        const amount = mov.amount !== undefined ? mov.amount : (mov.total_amount || 0);
        const docType = mov.documentType || mov.document_type || 'ticket';
        const date = mov.date ? new Date(mov.date) : new Date();

        const content = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Courier New', monospace; width: ${width}; margin: 0; padding: 10px; font-size: 12px; }
                        .text-center { text-align: center; }
                        .bold { font-weight: bold; }
                        .border-b { border-bottom: 1px dashed #000; margin: 5px 0; }
                        table { width: 100%; border-collapse: collapse; }
                    </style>
                </head>
                <body>
                    <div class="text-center">
                        <div class="bold" style="font-size: 16px;">${ticketSettings?.business_name || org?.name}</div>
                        <div>CUIT: ${ticketSettings?.cuit || ''}</div>
                        <div class="border-b"></div>
                        <div>${{
                'ticket': 'TICKET',
                'invoice': 'FACTURA',
                'quote': 'PRESUPUESTO',
                'delivery_note': 'REMITO',
                'credit_note': 'NOTA DE CRÉDITO'
            }[docType as string] || 'COMPROBANTE'}</div>
                        <div>${format(date, "dd/MM/yyyy HH:mm")}</div>
                        <div class="border-b"></div>
                    </div>
                    <table>
                        ${items?.map((i: any) => `
                            <tr>
                                <td>${i.product_name} x ${i.quantity}</td>
                                <td align="right">${formatMoney(i.unit_price * i.quantity)}</td>
                            </tr>
                        `).join('')}
                    </table>
                    <div class="border-b"></div>
                    <div class="bold" align="right">TOTAL: ${formatMoney(amount)}</div>
                </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
    };

    // --- ACCIONES DE CAJA ---
    const handleOpenShift = async () => {
        if (!openingAmount || isNaN(Number(openingAmount))) return toast.error("Ingresá un monto inicial válido.");
        if (!initialRegister) return toast.error("No se ha detectado una caja válida.");
        startTransition(async () => {
            const res = await openCashRegister(orgId, initialRegister.id, Number(openingAmount), slug);
            if (res.error) toast.error(`Error: ${res.error}`);
            else {
                toast.success("Caja abierta correctamente");
                setActiveBox(null);
                setOpeningAmount('');
                router.refresh();
            }
        });
    };

    const handleCloseShift = async () => {
        if (!realCash) return toast.error("Ingrese el monto de cierre");

        startTransition(async () => {
            // Calculate Total Closing Balance (Input + Opening Control)
            // Because user inputs "Net Cash" + "Opening Control" separately.
            const opening = Number(closingInitialControl) || 0;
            const finalClosingBalance = Number(realCash) + opening;

            const res = await closeCashRegister(activeSession.id, initialRegister.id, finalClosingBalance, closeComment, slug, cashierName, shiftName, orgId);
            if (res.success) {
                toast.success("Turno cerrado correctamente");
                router.refresh();
                setRealCash('');
                setCashierName('');
                setShiftName('');
                setCloseComment('');
            } else {
                toast.error(res.error);
            }
        });
    };

    const handleCancel = async () => {
        if (!saleToCancel) return;
        startTransition(async () => {
            const res = await cancelSaleAction(saleToCancel, orgId, slug);
            if (res.error) toast.error(res.error);
            else {
                setSaleToCancel(null);
                setShowSuccessModal(true);
                router.refresh();
            }
        });
    };

    // --- PROCESAMIENTO DE DATOS ---
    const allMovements = useMemo(() => {
        const salesMapped = (initialSales || []).map((s: any) => {
            let amountCash = 0;
            let amountDigital = 0;
            let methodLabel = s.payment_method || 'Desconocido';

            if (s.payments && s.payments.length > 0) {
                const uniqueMethods = new Set<string>();
                s.payments.forEach((p: any) => {
                    const m = p.method;
                    if (m === 'cash') amountCash += p.amount;
                    else if (['credit_card', 'debit_card', 'transfer', 'check'].includes(m)) amountDigital += p.amount;
                    uniqueMethods.add(m);
                });
                if (uniqueMethods.size > 1) methodLabel = 'MIXTO';
                else methodLabel = s.payments[0].method;
            } else {
                if (methodLabel === 'cash') amountCash = Number(s.total_amount);
                else amountDigital = Number(s.total_amount);
            }

            return {
                id: s._id || s.id,
                sessionId: s.session_id ? (typeof s.session_id === 'object' ? s.session_id.toString() : s.session_id) : undefined, // Added sessionId
                date: new Date(s.date || s.createdAt || s.created_at),
                customer: s.customer_id?.name || s.customers?.name || 'Consumidor Final',
                type: 'Venta',
                documentType: s.document_type || 'ticket',
                detail: `${s.sale_items?.length || 0} productos`,
                amount: Number(s.total_amount) || 0,
                amountCash,
                amountDigital,
                performer: s.performer || 'S/D', // Poblado via aggregate $lookup
                method: methodLabel,
                isEgreso: false,
                status: s.status,
                items: s.sale_items || [],
                payments: s.payments || [],
                discount_general: s.discount_general,
                surcharge_general: s.surcharge_general,
                rounding_difference: s.rounding_difference,
                invoice_letter: s.invoice_letter,
                fiscal_data: s.fiscal_data,
                manual_tax_added: s.manual_tax_added,
                ticket_number: s.ticket_number || (s._id ? s._id.toString().slice(-6).toUpperCase() : '---'),
            };
        });

        const manualMapped = (initialManualMovements || []).map((m: any) => {
            const method = m.paymentMethod || 'Efectivo';
            const isCashMethod = ['Efectivo', 'CASH', 'cash'].includes(method);
            const amount = Number(m.amount) || 0;
            const clientName = m.customer && typeof m.customer === 'object' ? m.customer.name
                : m.supplier && typeof m.supplier === 'object' ? m.supplier.name
                    : (m.customer || 'Movimiento Manual');

            return {
                id: m._id || m.id,
                sessionId: m.session ? (typeof m.session === 'object' ? m.session.toString() : m.session) : undefined, // Added sessionId
                date: new Date(m.date || m.createdAt || m.created_at),
                customer: clientName,
                type: (m.type === 'IN' || m.type === 'SALE' || m.type === 'PAYMENT_RECEIVED') ? 'Ingreso' : 'Egreso',
                detail: m.description,
                amount: amount,
                amountCash: isCashMethod ? amount : 0,
                amountDigital: !isCashMethod ? amount : 0,
                method: method,
                isCash: isCashMethod,
                isAccount: false, // Explicitly false as this is a cash movement derived from it
                isEgreso: ['OUT', 'EXPENSE', 'WITHDRAWAL'].includes(m.type),
                status: m.status || 'completed',
                performer: m.createdBy,
                items: [],
            };
        });

        return [...salesMapped, ...manualMapped].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [initialSales, initialManualMovements]);

    // Split Movements: Active vs Past (Today)
    const activeMovements = useMemo(() => {
        if (!activeSession) return [];
        return allMovements.filter(m => m.sessionId === activeSession.id);
    }, [allMovements, activeSession]);

    // Helper calculate Stats
    const calculateStats = (movements: any[], openingBalance: number = 0) => {
        const active = movements.filter(m => m.status !== 'cancelled');
        let totalCash = 0;
        let totalDigital = 0;
        let totalEgresos = 0;

        active.forEach(m => {
            if (m.isEgreso) {
                totalEgresos += m.amount;
            } else {
                if (m.type === 'Ingreso' || m.type === 'Venta') {
                    totalCash += (m.amountCash || 0);
                    totalDigital += (m.amountDigital || 0);
                }
            }
        });

        const netBalance = totalCash - totalEgresos; // Operational Balance (without opening)

        return {
            ingresosCash: totalCash,
            ingresosDigital: totalDigital,
            totalIngresos: totalCash + totalDigital,
            egresos: totalEgresos,
            balanceNeto: netBalance,
            saldoInicial: openingBalance,
            saldoTotalEsperado: openingBalance + netBalance,
            listaEgresos: active.filter(m => m.isEgreso),
            listaIngresos: active.filter(m => !m.isEgreso)
        };
    };

    // 1. Group Movements by Session ID
    const movementsBySession = useMemo(() => {
        const groups: Record<string, any[]> = {};
        allMovements.forEach(m => {
            const sId = m.sessionId ? m.sessionId.toString() : 'unknown';
            if (!groups[sId]) groups[sId] = [];
            groups[sId].push(m);
        });
        return groups;
    }, [allMovements]);

    // 2. Prepare Session List (Active + History + Orphans)
    const sessionsList = useMemo(() => {
        const list = [];

        // A. Active Session
        if (activeSession) {
            list.push({
                id: activeSession.id,
                isOpen: true,
                openedAt: new Date(activeSession.createdAt || activeSession.openedAt),
                closedAt: null,
                shiftName: activeSession.shiftName || 'Turno Actual',
                cashierName: activeSession.cashierName || activeSession.openedBy?.name || 'Cajero',
                initialBalance: Number(activeSession.openingBalance || activeSession.opening_balance || 0),
                closingBalance: undefined,
            });
        }

        // B. Closed Sessions from History
        const seenIds = new Set(list.map(s => s.id));
        (initialHistory || []).forEach((h: any) => {
            if (seenIds.has(h.id || h._id)) return;

            list.push({
                id: h.id || h._id,
                isOpen: false,
                openedAt: new Date(h.openedAt),
                closedAt: h.closedAt ? new Date(h.closedAt) : null,
                shiftName: h.shiftName || 'Turno Cerrado',
                cashierName: h.cashierName || h.openedBy?.name || 'Cajero',
                initialBalance: Number(h.openingBalance || 0),
                closingBalance: Number(h.closingBalance || 0),
            });
        });

        // C. RECOVERY: Check for Movement Groups that don't have a Session Card yet
        // This ensures that even if History didn't load the session (e.g. date mismatch), 
        // if we have movements for it, we show them.
        Object.keys(movementsBySession).forEach(groupId => {
            if (!seenIds.has(groupId)) {

                // If the group is 'unknown', we create the specific Orphan card.
                // If it's a valid ID (orphaned from history but valid session), we create a Recovered Session card.

                const groupMovs = movementsBySession[groupId];
                if (groupMovs.length > 0) {
                    const firstDate = groupMovs[0].date; // Use date of first movement
                    const isUnknown = groupId === 'unknown' || groupId === 'null' || groupId === 'undefined';

                    list.push({
                        id: groupId,
                        isOpen: false,
                        openedAt: firstDate,
                        closedAt: null, // We don't know close time, assume inferred.
                        shiftName: isUnknown ? 'Movimientos Sin Turno (Histórico)' : 'Turno (Recuperado)',
                        cashierName: '-',
                        initialBalance: 0,
                        closingBalance: 0,
                        isVirtual: true // Mark as virtual so we style it if needed (or just treat as history)
                    });
                    seenIds.add(groupId);
                }
            }
        });

        return list.sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime());
    }, [activeSession, initialHistory, movementsBySession]);

    // 3. Filter Sessions based on Search
    const filteredSessions = useMemo(() => {
        return sessionsList.map(session => {
            const sessionMovements = movementsBySession[session.id] || [];
            if (session.isOpen && sessionMovements.length === 0) {
                // Try strict filtering active movements manually if ID mapping failed? 
                // Actually activeMovements logic was: allMovements.filter(m => m.sessionId === activeSession.id)
                // If that worked, this should work.
            }

            const stats = calculateStats(sessionMovements, session.initialBalance);

            // Filtering Logic
            const metaMatch =
                (session.shiftName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (session.cashierName || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchingMovements = sessionMovements.filter(m => {
                const matchesSearch = (m.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (m.detail || '').toLowerCase().includes(searchTerm.toLowerCase());

                let genericType = 'VARIOS';
                if (m.type === 'Venta') {
                    const docType = ((m as any).documentType || 'ticket').toLowerCase();
                    const typeMap: Record<string, string> = {
                        'ticket': 'TICKET', 'invoice': 'FACTURA', 'quote': 'PRESUPUESTO',
                        'delivery_note': 'REMITO', 'credit_note': 'NOTA DE CRÉDITO'
                    };
                    genericType = typeMap[docType] || 'TICKET';
                    if (docType === 'invoice') genericType = 'FACTURA';
                } else {
                    genericType = m.type === 'Ingreso' ? 'INGRESO' : 'EGRESO';
                }
                const matchesType = selectedTypes.has(genericType);
                return matchesSearch && matchesType;
            });

            // Auto-expand logic
            const hasMatches = metaMatch || matchingMovements.length > 0;
            const shouldExpand = (session.isOpen) || (searchTerm.length > 0 && hasMatches);

            return {
                ...session,
                stats,
                visibleMovements: searchTerm ? matchingMovements : sessionMovements,
                isVisible: hasMatches || (!searchTerm && selectedTypes.size === allTypes.length) || session.isOpen,
                forceExpand: shouldExpand
            };
        }).filter(s => s.isVisible);
    }, [sessionsList, movementsBySession, searchTerm, selectedTypes, activeSession, calculateStats]);

    // State for expanded sessions
    const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

    // Effect to auto-expand active session
    useEffect(() => {
        if (activeSession) {
            setExpandedSessions(prev => new Set(prev).add(activeSession.id));
        }
    }, [activeSession]);

    // Effect for search expansion
    useEffect(() => {
        if (searchTerm) {
            const newExpanded = new Set<string>();
            filteredSessions.forEach(s => {
                if (s.forceExpand) newExpanded.add(s.id);
            });
            setExpandedSessions(newExpanded);
        }
    }, [searchTerm, filteredSessions]);

    const toggleSession = (id: string) => {
        if (activeSession && id === activeSession.id) return;
        setExpandedSessions(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // 1. Current Session Stats (Zero-based + its own opening balance)
    const currentStats = useMemo(() => {
        const opening = Number(activeSession?.openingBalance || activeSession?.opening_balance) || 0;
        return calculateStats(activeMovements, opening);
    }, [activeMovements, activeSession, calculateStats]);

    // 2. Daily Global Stats (All movements of the day/range)
    const dailyStats = useMemo(() => {
        const filtered = allMovements.filter(m => {
            const mDate = format(m.date, 'yyyy-MM-dd');
            return mDate >= dates.from && mDate <= dates.to;
        });
        return calculateStats(filtered, 0);
    }, [allMovements, dates, calculateStats]);

    const stats = currentStats;

    return (
        <div className="space-y-6">
            {isMounted && !navigator.onLine && (
                <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl flex items-center gap-2 mb-2 animate-pulse">
                    <WifiOff size={14} className="text-amber-500" />
                    <span className="text-[10px] font-black text-amber-600 uppercase">Consulta Offline - Datos locales activos</span>
                </div>
            )}
            <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 flex-1 max-w-xl">
                    <div className="px-3 h-9 bg-slate-200 rounded-lg flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase border border-slate-300">
                        <Search size={14} /> BUSCAR
                    </div>
                    <Input
                        placeholder="Buscar movimiento en todos los turnos..."
                        className="bg-transparent border-0 focus-visible:ring-0 text-slate-900 text-sm h-9 shadow-none flex-1"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

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

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 cursor-pointer" onClick={() => fromRef.current?.showPicker()}>
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">Desde:</div>
                    <input
                        ref={fromRef}
                        type="date"
                        value={dates.from}
                        onChange={(e) => handleDateChange('from', e.target.value)}
                        className="bg-transparent border-none text-[10px] font-bold uppercase text-slate-700 focus:ring-0 h-9 [&::-webkit-calendar-picker-indicator]:hidden"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 cursor-pointer" onClick={() => toRef.current?.showPicker()}>
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">Hasta:</div>
                    <input
                        ref={toRef}
                        type="date"
                        value={dates.to}
                        onChange={(e) => handleDateChange('to', e.target.value)}
                        className="bg-transparent border-none text-[10px] font-bold uppercase text-slate-700 focus:ring-0 h-9 [&::-webkit-calendar-picker-indicator]:hidden"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                <div className="ml-auto">
                    {isRegisterOpen ? (
                        canCreateMovement && (
                            <Button onClick={() => setActiveBox('manual')} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl shadow-none">
                                <Plus className="mr-2 h-4 w-4" /> Movimiento Manual
                            </Button>
                        )
                    ) : (
                        <Button onClick={() => setActiveBox('abrir')} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl shadow-none">
                            Abrir Caja
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {!canViewHistory ? (
                    <div className="p-8 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed flex flex-col items-center gap-2">
                        <ShieldCheck className="h-10 w-10 text-slate-300" />
                        <span>No tienes permiso para ver el historial de movimientos.</span>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed">
                        No se encontraron sesiones o movimientos.
                    </div>
                ) : (
                    filteredSessions.map(session => {
                        const isExpanded = expandedSessions.has(session.id);
                        const isCurrent = session.isOpen;

                        return (
                            <div key={session.id} className={cn("border rounded-2xl overflow-hidden transition-all shadow-sm", isCurrent ? "bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50" : "bg-white border-slate-200")}>
                                {/* Session Header */}
                                <div
                                    className={cn("p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors", isCurrent && "bg-indigo-50/30")}
                                    onClick={() => toggleSession(session.id)}
                                >
                                    <div className="flex-1 flex flex-col xl:flex-row xl:items-center gap-6">
                                        <div className="flex items-center gap-3 xl:w-40 xl:shrink-0">
                                            <div className={cn("h-10 w-10 text-[10px] rounded-xl flex items-center justify-center font-black uppercase shrink-0 transition-colors", isCurrent ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500")}>
                                                {isCurrent ? <Wallet size={18} /> : <History size={18} />}
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-black uppercase text-slate-700 leading-none mb-1">{format(session.openedAt, 'dd/MM/yyyy', { locale: es })}</p>
                                                {isCurrent ? <Badge className="bg-emerald-500 text-[9px] h-4 px-1">ACTIVO</Badge> : <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">CERRADO</span>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-2 gap-y-4 flex-1">
                                            <div><p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Apertura</p><p className="font-bold text-xs text-slate-700">{format(session.openedAt, 'HH:mm')}</p></div>
                                            <div><p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Cierre</p><p className="font-bold text-xs text-slate-700">{session.closedAt ? format(session.closedAt, 'HH:mm') : '-'}</p></div>

                                            <div className="lg:col-span-1"><p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Cajero</p><p className="font-bold text-xs text-slate-700 truncate pr-2" title={session.cashierName}>{session.cashierName}</p></div>
                                            <div className="lg:col-span-1"><p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Turno</p><p className="font-bold text-xs text-slate-700 truncate pr-2" title={session.shiftName}>{session.shiftName}</p></div>

                                            <div><p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Caja Inicial</p><p className="font-bold text-slate-500 text-xs">{formatMoney(session.initialBalance)}</p></div>
                                            <div><p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Pxmo. Turno</p><p className="font-bold text-blue-600 text-xs">{session.closedAt ? formatMoney(session.closingBalance || 0) : '-'}</p></div>
                                        </div>
                                    </div>
                                    <div className={cn("ml-4 transition-transform duration-300 shrink-0", isExpanded ? "rotate-180 text-indigo-500" : "text-slate-300")}>
                                        <ArrowDownRight size={20} />
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/50">
                                        <Table>
                                            <TableHeader className="bg-slate-50 h-10 text-xs uppercase font-black border-slate-200 text-slate-500">
                                                <TableRow className="border-b-slate-100 hover:bg-transparent">
                                                    <TableHead className="w-[100px]">Hora</TableHead>
                                                    <TableHead>Cliente / Detalle</TableHead>
                                                    <TableHead>Tipo</TableHead>
                                                    <TableHead>Método</TableHead>
                                                    <TableHead className="text-right">Efectivo</TableHead>
                                                    <TableHead className="text-right">Egreso</TableHead>
                                                    <TableHead className="text-right">Digital</TableHead>
                                                    <TableHead className="text-center">Operador</TableHead>
                                                    <TableHead className="text-right w-[100px]">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {session.visibleMovements.length === 0 ? (
                                                    <TableRow><TableCell colSpan={8} className="text-center py-6 italic text-slate-400 text-xs text-center">Sin movimientos en este turno.</TableCell></TableRow>
                                                ) : (
                                                    session.visibleMovements.map((mov: any) => (
                                                        <TableRow key={mov.id} className={cn("border-b-slate-100 hover:bg-white transition-colors", mov.status === 'cancelled' && "opacity-40 grayscale line-through decoration-slate-400")}>
                                                            <TableCell className="text-sm font-mono py-3">
                                                                <span className="font-bold text-slate-600">{format(mov.date, 'HH:mm')}</span>
                                                            </TableCell>
                                                            <TableCell className="py-3">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm text-slate-800">{mov.customer}</span>
                                                                    <span className="text-xs text-slate-400 truncate max-w-[200px]">{mov.detail}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-3">
                                                                <Badge variant="outline" className="text-xs uppercase font-black h-6 px-2 border-slate-200 bg-white shadow-sm">
                                                                    {mov.type === 'Venta' ? (
                                                                        {
                                                                            'ticket': 'TICKET',
                                                                            'invoice': (mov as any).invoice_letter ? `FACTURA ${(mov as any).invoice_letter}` : 'FACTURA',
                                                                            'quote': 'PRESUPUESTO', 'delivery_note': 'REMITO', 'credit_note': 'NOTA DE CRÉDITO'
                                                                        }[(mov as any).documentType as string] || 'VENTA'
                                                                    ) : mov.type}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-xs uppercase font-bold text-slate-500 py-3">
                                                                {(() => {
                                                                    const m = (mov.method || '').toUpperCase();
                                                                    if (m === 'MIXTO') return 'Mixto';
                                                                    if (m.includes('CARD') || m.includes('CRÉDITO') || m.includes('DÉBITO')) return 'Tarjeta';
                                                                    if (m.includes('CHECK') || m.includes('CHEQUE')) return 'Cheque';
                                                                    if (m.includes('TRANSFER')) return 'Transf.';
                                                                    if (m.includes('ACCOUNT') || m.includes('CTA')) return 'Cta.Cte.';
                                                                    if (m.includes('CASH') || m.includes('EFECTIVO')) return 'Efectivo';
                                                                    return mov.method;
                                                                })()}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-sm py-3 text-emerald-600 font-bold">
                                                                {!mov.isEgreso && mov.amountCash > 0 ? formatMoney(mov.amountCash) : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-sm py-3 text-red-500 font-bold">
                                                                {mov.isEgreso ? formatMoney(mov.amount) : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-sm py-3 text-blue-600 font-bold">
                                                                {!mov.isEgreso && mov.amountDigital > 0 ? formatMoney(mov.amountDigital) : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-center py-3">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-[10px] font-bold text-slate-700 uppercase px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                                                                        {mov.type === 'Venta' ? (mov.performer?.name || 'S/D') : (mov.performer?.name || mov.performer || 'Sistema')}
                                                                    </span>
                                                                    {(mov.performer?.roleId?.name || mov.performer?.role) && (
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase mt-0.5 italic tracking-widest">
                                                                            {mov.performer.roleId?.name || (mov.performer.role === 'admin' ? 'Administrador' : mov.performer.role)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right py-2">
                                                                <div className="flex justify-end gap-1">
                                                                    {canViewDetail && <button onClick={(e) => { e.stopPropagation(); setSelectedMovement(mov); }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600"><Eye size={14} /></button>}
                                                                    {mov.type === 'Venta' && <button onClick={(e) => { e.stopPropagation(); handlePrint(mov); }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900"><Printer size={14} /></button>}
                                                                    {mov.type === 'Venta' && mov.status !== 'cancelled' && canVoidSale && <button onClick={(e) => { e.stopPropagation(); setSaleToCancel(mov.id); }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Ban size={14} /></button>}
                                                                    {mov.type !== 'Venta' && mov.status !== 'cancelled' && canVoidMovement && <button onClick={(e) => { e.stopPropagation(); setMovementToVoid(mov); }} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Ban size={14} /></button>}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricBox title="Total Ingreso en Turno" value={stats.totalIngresos} color="green" icon={<ArrowUpRight size={18} />} onClick={() => setActiveBox('ingresos')} />
                <MetricBox title="Total Esperado en Turno" value={stats.balanceNeto} color="zinc" icon={<Wallet size={18} />} onClick={() => setActiveBox('neto')} />
                <MetricBox title="Total de Todos los Turnos" value={dailyStats.totalIngresos} color="blue" icon={<CalendarDays size={18} />} onClick={() => setActiveBox('global')} />
                <MetricBox title="Estado Caja" value={isRegisterOpen ? (activeSession?.shiftName || 'Abierta') : 'Cerrada'} color="pink" icon={<History size={18} />} onClick={() => setActiveBox('abrir')} />
            </div>

            <Dialog open={!!activeBox} onOpenChange={() => setActiveBox(null)}>
                <DialogContent className={cn(
                    "rounded-[24px] md:rounded-[32px] overflow-hidden p-0 border-none shadow-2xl w-[95vw] sm:max-w-lg max-h-[90vh] flex flex-col transition-all duration-300",
                    activeBox === 'abrir' && "sm:max-w-4xl",
                    activeBox === 'manual' && "sm:max-w-lg bg-white border-none p-0 shadow-2xl flex flex-col rounded-[2rem]"
                )}>
                    <DialogHeader className="bg-slate-50 p-4 md:p-6 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-lg md:text-xl font-black uppercase tracking-tight">
                            {activeBox === 'abrir' ? "Gestión de Caja" :
                                activeBox === 'ingresos' ? "Resumen de Ingresos" :
                                    activeBox === 'egresos' ? "Detalle de Egresos" :
                                        activeBox === 'global' ? "Resumen Global del Día" :
                                            activeBox === 'manual' ? "Nuevo Movimiento" : "Saldo Neto Actual"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-4 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                        {activeBox === 'global' && (
                            <div className="space-y-6 text-slate-900">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Efectivo</p>
                                        <p className="text-xl font-black">{formatMoney(dailyStats.ingresosCash)}</p>
                                    </div>
                                    <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100 text-center">
                                        <p className="text-[10px] font-bold text-blue-600 uppercase">Digital</p>
                                        <p className="text-xl font-black">{formatMoney(dailyStats.ingresosDigital)}</p>
                                    </div>
                                    <div className="p-5 bg-red-50 rounded-3xl border border-red-100 text-center">
                                        <p className="text-[10px] font-bold text-red-600 uppercase">Egresos Totales</p>
                                        <p className="text-xl font-black text-red-600">-{formatMoney(dailyStats.egresos)}</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-900 rounded-[24px] text-center text-white shadow-xl">
                                    <p className="text-xs font-bold uppercase text-slate-400 mb-1">Balance Total (Ingresos - Egresos)</p>
                                    <p className="text-4xl font-black">{formatMoney(dailyStats.totalIngresos - dailyStats.egresos)}</p>
                                </div>
                            </div>
                        )}

                        {activeBox === 'abrir' && (
                            <div className="space-y-6 min-h-0 md:min-h-[500px]">
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    {['Turnos Hoy', 'Historial'].map((tab: any) => (
                                        <button key={tab} onClick={() => setActiveTab(tab)} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeTab === tab ? "bg-white shadow-sm text-black" : "text-slate-400")}>{tab}</button>
                                    ))}
                                </div>

                                {activeTab === 'Turnos Hoy' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-900">
                                        <div className="space-y-6">
                                            <div className="p-4 md:p-6 bg-slate-50 rounded-2xl border">
                                                <p className="text-[10px] font-bold uppercase text-slate-400">Caja Inicial</p>
                                                <p className="text-3xl md:text-4xl font-black text-pink-600">{formatMoney(Number(isRegisterOpen ? (activeSession?.openingBalance || activeSession?.opening_balance) : openingAmount) || 0)}</p>
                                            </div>
                                            <div className="p-4 md:p-6 bg-white border rounded-2xl space-y-3 shadow-sm text-sm">
                                                <div className="flex justify-between"><span>Ventas Efectivo:</span><span className="font-bold text-emerald-600">+{formatMoney(stats.ingresosCash)}</span></div>
                                                <div className="flex justify-between"><span>Egresos/Gastos:</span><span className="font-bold text-red-600">-{formatMoney(stats.egresos)}</span></div>
                                                <div className="pt-2 mt-2 border-t border-dashed">
                                                    <div className="flex justify-between items-center text-slate-500 text-xs"><span>Balance del Turno:</span><span className="font-bold">{formatMoney(stats.balanceNeto)}</span></div>
                                                    <div className="flex justify-between items-center text-slate-500 text-xs mt-1"><span>+ Caja Inicial:</span><span className="font-bold">{formatMoney(stats.saldoInicial)}</span></div>
                                                </div>
                                                <div className="pt-4 border-t flex justify-between items-end"><span className="text-xs font-bold uppercase text-blue-900">Total Esperado (Físico):</span><span className="text-2xl md:text-3xl font-black text-blue-600">{formatMoney(stats.saldoTotalEsperado)}</span></div>
                                            </div>
                                            {/* Stats Cards */}
                                            {stats.balanceNeto < 0 && (
                                                <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-xs font-medium">
                                                    <AlertTriangle size={16} />
                                                    <span>Atención: El balance operativo actual es negativo.</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-5 md:p-8 border-2 border-dashed rounded-[24px] md:rounded-[32px] space-y-5">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400">{isRegisterOpen ? 'Cierre de Caja' : 'Monto de Apertura'}</label>
                                            </div>
                                            <div className="space-y-4">
                                                {isRegisterOpen ? (
                                                    canCloseShift ? (
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between items-center px-1">
                                                                    <label className="text-[10px] font-bold uppercase text-slate-500">Caja de Próximo Turno</label>
                                                                </div>
                                                                <div className="relative">
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        step={0.01}
                                                                        placeholder="0.00"
                                                                        className="pl-8 h-12 text-lg font-bold bg-white text-slate-700 border-slate-200 focus:border-indigo-500 rounded-xl"
                                                                        value={closingInitialControl}
                                                                        onChange={(e) => setClosingInitialControl(e.target.value)}
                                                                    />
                                                                    <span className="absolute left-3 top-3.5 text-slate-400 font-bold">$</span>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between items-center px-1">
                                                                    <label className="text-[10px] font-bold uppercase text-slate-500">Efectivo del Turno Actual</label>
                                                                </div>
                                                                <div className="relative">
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        step={0.01}
                                                                        placeholder="0.00"
                                                                        className="pl-8 h-12 text-lg font-bold bg-white text-slate-700 border-slate-200 focus:border-indigo-500 rounded-xl"
                                                                        value={realCash}
                                                                        onChange={(e) => setRealCash(e.target.value)}
                                                                    />
                                                                    <span className="absolute left-3 top-3.5 text-slate-400 font-bold">$</span>
                                                                </div>
                                                            </div>
                                                            {(() => {
                                                                const totalCounted = (Number(closingInitialControl) || 0) + (Number(realCash) || 0);
                                                                const diff = totalCounted - stats.saldoTotalEsperado;
                                                                return (
                                                                    <div className={cn("col-span-2 p-3 rounded-xl border flex justify-between items-center transition-all", diff === 0 ? "bg-slate-50 border-slate-200 text-slate-400" : diff > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700")}>
                                                                        <span className="text-[10px] font-black uppercase">Diferencia</span>
                                                                        <span className="text-lg font-black">{diff > 0 ? '+' : ''}{formatMoney(diff)}</span>
                                                                    </div>
                                                                )
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <div className="p-8 bg-slate-50 rounded-2xl border border-dashed text-center flex flex-col items-center justify-center gap-2">
                                                            <Ban className="text-slate-300" size={32} />
                                                            <p className="text-sm text-slate-400 font-medium italic">No tienes permisos para realizar el cierre de caja.</p>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="space-y-1">
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                value={openingAmount}
                                                                onChange={(e) => setOpeningAmount(e.target.value)}
                                                                placeholder="0.00"
                                                                className="h-14 text-2xl font-black pl-8"
                                                            />
                                                            <span className="absolute left-3 top-4 text-slate-400 font-bold">$</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 px-1 block">Cajero</label>
                                                    <Input value={isRegisterOpen ? (activeSession?.cashierName || activeSession?.openedBy?.name || 'Cajero') : cashierName} onChange={isRegisterOpen ? undefined : (e) => setCashierName(e.target.value)} readOnly={isRegisterOpen} className={cn("font-bold h-10 rounded-xl", isRegisterOpen && "bg-slate-50 text-slate-600 border-slate-200")} placeholder="Nombre..." />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 px-1 block">Turno</label>
                                                    <Input value={isRegisterOpen ? (activeSession?.shiftName || 'Turno') : shiftName} onChange={isRegisterOpen ? undefined : (e) => setShiftName(e.target.value)} readOnly={isRegisterOpen} className={cn("font-bold h-10 rounded-xl", isRegisterOpen && "bg-slate-50 text-slate-600 border-slate-200")} placeholder="Mañana/Tarde..." />
                                                </div>
                                            </div>

                                            <textarea value={closeComment} onChange={(e) => setCloseComment(e.target.value)} className="w-full p-4 border rounded-2xl italic min-h-[100px]" placeholder={isRegisterOpen ? "Notas de cierre..." : "Observaciones de apertura..."} />
                                            <Button
                                                onClick={isRegisterOpen ? handleCloseShift : handleOpenShift}
                                                disabled={isPending || (isRegisterOpen && !canCloseShift)}
                                                className={cn(
                                                    "w-full h-14 font-bold rounded-2xl uppercase tracking-widest text-white transition-all shadow-lg",
                                                    isRegisterOpen ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-black"
                                                )}
                                            >
                                                {isPending ? <Loader2 className="animate-spin" /> : (isRegisterOpen ? 'Cerrar Turno' : 'Abrir Turno')}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'Historial' && (
                                    <div className="space-y-4 text-slate-900">

                                        <div className="flex gap-2 items-end flex-wrap bg-slate-50 p-3 md:p-4 rounded-xl border">
                                            <div className="space-y-1 flex-1 min-w-[120px]">
                                                <label className="text-[10px] font-bold uppercase text-slate-500">Desde</label>
                                                <Input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="h-9 bg-white" />
                                            </div>
                                            <div className="space-y-1 flex-1 min-w-[120px]">
                                                <label className="text-[10px] font-bold uppercase text-slate-500">Hasta</label>
                                                <Input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="h-9 bg-white" />
                                            </div>

                                            {allBranches.length > 0 && (
                                                <div className="space-y-1 flex-1 min-w-[150px]">
                                                    <label className="text-[10px] font-bold uppercase text-slate-500">Sucursal</label>
                                                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                                        <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Todas" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Todas</SelectItem>
                                                            {allBranches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <div className="space-y-1 flex-1 min-w-[150px]">
                                                <label className="text-[10px] font-bold uppercase text-slate-500">Caja</label>
                                                <Select value={selectedRegister} onValueChange={setSelectedRegister}>
                                                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Todas" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todas</SelectItem>
                                                        {allRegisters.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Button size="sm" onClick={handleHistoryFilter} className="h-9 bg-slate-900 text-white hover:bg-slate-700 w-full md:w-auto">
                                                <Filter className="w-4 h-4 mr-2" />
                                                Filtrar
                                            </Button>
                                        </div>

                                        {!viewingSession ? (
                                            <div className="space-y-4">
                                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
                                                    <Table>
                                                        <TableHeader className="bg-slate-50/80 h-10 text-[10px] uppercase font-black border-slate-200 text-slate-600">
                                                            <TableRow>
                                                                <TableHead>ID</TableHead>
                                                                <TableHead>Fecha</TableHead>
                                                                <TableHead>Caja</TableHead>
                                                                <TableHead>Cajero</TableHead>
                                                                <TableHead className="text-right">Apertura</TableHead>

                                                                <TableHead className="text-right">Real</TableHead>
                                                                <TableHead className="text-right">Diferencia</TableHead>
                                                                <TableHead className="text-right">Acciones</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {initialHistory.length === 0 ? (
                                                                <TableRow><TableCell colSpan={7} className="text-center py-10 italic text-slate-400">No hay turnos cerrados.</TableCell></TableRow>
                                                            ) : (
                                                                groupedHistory.map(([date, sessions]) => (
                                                                    <React.Fragment key={date}>
                                                                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                                                                            <TableCell colSpan={7} className="py-2 px-4 font-black text-xs uppercase text-slate-500 tracking-widest border-t border-b border-slate-200">
                                                                                {format(new Date(date), "EEEE dd 'de' MMMM", { locale: es })}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                        {sessions.map((session: any) => {
                                                                            const diff = (session.closingBalance || 0) - (session.expectedBalance || 0);
                                                                            return (
                                                                                <TableRow key={session.id}>
                                                                                    <TableCell className="text-[10px] font-mono p-2 text-slate-400" title={session.id}>{session.id.slice(-8).toUpperCase()}</TableCell>
                                                                                    <TableCell className="text-xs">
                                                                                        <div className="font-bold">{session.openedAt ? format(new Date(session.openedAt), "HH:mm") : '--:--'}</div>
                                                                                        <span className="text-[10px] text-slate-400">Cierre: {session.closedAt ? format(new Date(session.closedAt), "HH:mm") : '-'}</span>
                                                                                    </TableCell>
                                                                                    <TableCell className="font-medium text-xs text-slate-500">{session.cashRegister?.name || 'Caja'}</TableCell>
                                                                                    <TableCell className="text-xs uppercase font-bold">{session.cashierName || '-'}</TableCell>
                                                                                    <TableCell className="text-right font-mono">{formatMoney(session.openingBalance)}</TableCell>

                                                                                    <TableCell className="text-right font-bold">{formatMoney(session.closingBalance || 0)}</TableCell>
                                                                                    <TableCell className={cn("text-right font-black", diff < 0 ? "text-red-500" : diff > 0 ? "text-emerald-500" : "text-slate-400")}>
                                                                                        {diff > 0 ? '+' : ''}{formatMoney(diff)}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleViewHistorySession(session)}><Eye size={16} /></Button></TableCell>
                                                                                </TableRow>
                                                                            )
                                                                        })}
                                                                    </React.Fragment>
                                                                ))
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                                <Button variant="ghost" size="sm" onClick={() => setViewingSession(null)} className="gap-2"><ArrowLeft size={14} /> Volver al listado</Button>
                                                <div className="p-4 bg-slate-900 rounded-2xl text-white flex justify-between items-center">
                                                    <div><p className="text-[10px] text-slate-400 font-black">TURNO DEL DÍA</p><p className="font-bold">{format(new Date(viewingSession.openedAt), "dd MMMM", { locale: es })}</p></div>
                                                    <div className="text-right"><p className="text-[10px] text-slate-400 font-black">RESULTADO REAL</p><p className="text-xl font-black">{formatMoney(viewingSession.closingBalance)}</p></div>
                                                </div>
                                                {loadingHistory ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
                                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                                        <p className="text-[10px] font-black uppercase text-slate-400 px-2 mb-2">Resumen de Ventas</p>
                                                        {historyDetail?.sales.map((s: any) => (
                                                            <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                                                                <span>Venta #{s.id.split('-')[0]} - {s.customers?.name || 'C. Final'}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold">{formatMoney(s.total_amount)}</span>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white hover:text-blue-600" onClick={() => setSelectedSale(s)}>
                                                                        <Eye size={14} className="text-slate-400" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {historyDetail?.movements.length! > 0 && <p className="text-[10px] font-black uppercase text-slate-400 px-2 mt-4 mb-2">Movimientos Manuales</p>}
                                                        {historyDetail?.movements.map((m: any) => (
                                                            <div key={m.id} className={cn("flex justify-between p-3 rounded-xl border text-sm", m.type === 'IN' ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100")}>
                                                                <span>{m.description}</span>
                                                                <span className="font-bold">{m.type === 'IN' ? '+' : '-'}{formatMoney(m.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeBox === 'ingresos' && (
                            <div className="space-y-6 text-slate-900">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Efectivo</p>
                                        <p className="text-xl font-black">{formatMoney(stats.ingresosCash)}</p>
                                    </div>
                                    <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100 text-center">
                                        <p className="text-[10px] font-bold text-blue-600 uppercase">Digital</p>
                                        <p className="text-xl font-black">{formatMoney(stats.ingresosDigital)}</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-900 rounded-[24px] text-center text-white shadow-xl">
                                    <p className="text-xs font-bold uppercase text-slate-400 mb-1">Total Ventas Brutas</p>
                                    <p className="text-4xl font-black">{formatMoney(stats.totalIngresos)}</p>
                                </div>
                            </div>
                        )}

                        {activeBox === 'egresos' && (
                            <div className="space-y-6 text-slate-900">
                                <div className="p-6 bg-red-50 rounded-[24px] text-center border border-red-100">
                                    <p className="text-xs font-bold uppercase text-red-500 mb-1">Total Salidas</p>
                                    <p className="text-4xl font-black text-red-600">{formatMoney(stats.egresos)}</p>
                                </div>

                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    <p className="text-[10px] font-black uppercase text-slate-400 px-2 mt-2 mb-2">Últimos Egresos</p>
                                    {stats.listaEgresos.length === 0 ? (
                                        <p className="text-center py-6 text-slate-400 italic text-xs">No hay egresos registrados.</p>
                                    ) : (
                                        stats.listaEgresos.map((m: any) => (
                                            <div key={m.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 text-sm shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{m.detail || 'Egreso Varios'}</span>
                                                    <span className="text-[10px] text-slate-400">{format(m.date, "dd/MM HH:mm")}</span>
                                                </div>
                                                <span className="font-black text-red-500">-{formatMoney(m.amount)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeBox === 'neto' && (
                            <div className="space-y-6 text-slate-900">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Caja Inicial</p>
                                        <p className="text-xl font-black">{formatMoney(Number(activeSession?.openingBalance || activeSession?.opening_balance) || 0)}</p>
                                    </div>
                                    <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Ingresos Efectivo</p>
                                        <p className="text-xl font-black">{formatMoney(stats.ingresosCash)}</p>
                                    </div>
                                    <div className="p-5 bg-red-50 rounded-3xl border border-red-100 text-center">
                                        <p className="text-[10px] font-bold text-red-600 uppercase">Egresos Efectivo</p>
                                        <p className="text-xl font-black text-red-600">-{formatMoney(stats.egresos)}</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-900 rounded-[24px] text-center text-white shadow-xl">
                                    <p className="text-xs font-bold uppercase text-slate-400 mb-1">En Caja (Efectivo + Inicial - Egresos)</p>
                                    <p className="text-4xl font-black">{formatMoney(stats.ingresosCash + (Number(activeSession?.openingBalance || activeSession?.opening_balance) || 0) - stats.egresos)}</p>
                                </div>
                            </div>
                        )}

                        {activeBox === 'manual' && activeSession && initialRegister && (
                            <ManualForm orgId={orgId} registerId={initialRegister.id} sessionId={activeSession.id} slug={slug} onDone={() => { setActiveBox(null); router.refresh(); }} />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* DETALLE OPERACIÓN (OJITO) */}
            {selectedMovement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative">
                        <button onClick={() => setSelectedMovement(null)} className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        <div className="p-8">
                            <h3 className="font-black text-slate-900 uppercase text-xl mb-4 italic tracking-tighter">Detalle de Operación</h3>
                            {selectedMovement.type === 'Venta' ? (
                                <>
                                    <div className="mb-4 text-sm text-slate-600 space-y-1 italic border-b pb-4">
                                        <p><strong>Fecha:</strong> {format(selectedMovement.date, "dd/MM/yyyy HH:mm")}</p>
                                        <p><strong>Cliente:</strong> {selectedMovement.customer}</p>
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                                            <tr><th className="px-2 py-3 text-left">Producto</th><th className="px-2 py-3 text-right">Cant.</th><th className="px-2 py-3 text-right">Subtotal</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedMovement.items?.map((item: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="px-2 py-3 font-medium text-slate-700">
                                                        <div className="flex flex-col">
                                                            <span>{item.product_name}</span>
                                                            {(item.variant_name || item.product_variant_name) && (
                                                                <span className="text-[9px] text-indigo-600 font-black uppercase">
                                                                    {item.variant_name || item.product_variant_name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-3 text-right font-bold text-slate-400">x{item.quantity}</td>
                                                    <td className="px-2 py-3 text-right font-black">{formatMoney(item.unit_price * item.quantity)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t font-black">
                                            <tr><td className="px-2 py-4 uppercase text-slate-400 text-xs">Total</td><td></td><td className="px-2 py-4 text-right text-indigo-600 text-2xl">{formatMoney(selectedMovement.amount)}</td></tr>
                                        </tfoot>
                                    </table>
                                    <Button onClick={() => handlePrint(selectedMovement)} className="w-full mt-6 bg-slate-900 text-white font-black h-14 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:bg-black transition-all">
                                        <Printer size={20} /> Imprimir Ticket
                                    </Button>
                                </>
                            ) : (
                                <div className="p-10 bg-slate-50 rounded-[32px] text-center border-2 border-dashed border-slate-200">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Movimiento Manual</p>
                                    <p className="text-2xl italic font-medium mb-6 text-slate-800">"{selectedMovement.detail}"</p>
                                    <div className="bg-indigo-50 inline-block px-8 py-4 rounded-3xl"><p className="text-5xl font-black text-indigo-600">{formatMoney(selectedMovement.amount)}</p></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALES DE ANULACIÓN Y ÉXITO */}
            {saleToCancel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center text-slate-900">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"><AlertTriangle className="h-8 w-8 text-red-600" /></div>
                        <h3 className="text-xl font-bold mb-2 uppercase tracking-tighter">¿Anular esta venta?</h3>
                        <p className="text-sm text-slate-500 mb-8 italic">El stock regresará al inventario automáticamente. Esta acción no se puede deshacer.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setSaleToCancel(null)} className="px-6 py-3 border border-slate-200 rounded-2xl w-full font-bold">Cerrar</button>
                            <button onClick={handleCancel} disabled={isPending} className="px-6 py-3 bg-red-600 text-white font-bold rounded-2xl w-full flex justify-center items-center">
                                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sí, Anular'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {movementToVoid && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center text-slate-900">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"><AlertTriangle className="h-8 w-8 text-red-600" /></div>
                        <h3 className="text-xl font-bold mb-2 uppercase tracking-tighter">¿Anular Movimiento?</h3>
                        <p className="text-sm text-slate-500 mb-8 italic">Se revertirá el saldo de la caja. Esta acción no se puede deshacer.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setMovementToVoid(null)} className="px-6 py-3 border border-slate-200 rounded-2xl w-full font-bold">Cerrar</button>
                            <button onClick={async () => {
                                setVoiding(true);
                                const res = await voidCashMovement(movementToVoid._id || movementToVoid.id, slug);
                                setVoiding(false);
                                if (res.error) {
                                    toast.error(res.error);
                                } else {
                                    toast.success("Movimiento anulado");
                                    setMovementToVoid(null);
                                }
                            }} disabled={voiding} className="px-6 py-3 bg-red-600 text-white font-bold rounded-2xl w-full flex justify-center items-center">
                                {voiding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sí, Anular'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden p-10 text-center text-slate-900 border-none">
                        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"><CheckCircle2 className="h-12 w-12 text-green-600" /></div>
                        <h3 className="text-2xl font-black mb-2 tracking-tighter uppercase">¡Venta Anulada!</h3>
                        <p className="text-sm text-slate-500 mb-10 italic">La operación se revirtió y el stock fue actualizado correctamente.</p>
                        <button onClick={() => setShowSuccessModal(false)} className="px-10 py-4 bg-slate-900 text-white font-black rounded-3xl w-full shadow-xl">Entendido</button>
                    </div>
                </div>
            )}
            {selectedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-semibold text-lg">Detalle de Venta (Historial)</h3>
                            <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="mb-4 text-sm text-slate-600 space-y-1">
                                <p><strong>Fecha:</strong> {new Date(selectedSale.date || selectedSale.created_at).toLocaleString()}</p>
                                <p><strong>Cliente:</strong> {selectedSale.customers?.name || 'Cliente Final'}</p>
                                <p><strong>Comprobante:</strong> {selectedSale.invoice_letter === 'A' ? 'Factura A' : selectedSale.invoice_letter === 'B' ? 'Factura B' : 'Ticket'}</p>
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
                                                    {item.product_details?.category_ids?.map((c: any) => (
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
                                <tfoot className="border-t bg-slate-50/50">
                                    <tr>
                                        <td colSpan={5} className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Subtotal</td>
                                        <td className="px-4 py-2 text-right text-slate-700 font-bold">
                                            {formatMoney(selectedSale.sale_items?.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0) || 0)}
                                        </td>
                                    </tr>
                                    {selectedSale.discount_general && (() => {
                                        const eligible = selectedSale.sale_items?.reduce((acc: number, item: any) => {
                                            if (item.exclude_from_general_discount) return acc;
                                            return acc + (item.unit_price * item.quantity);
                                        }, 0) || 0;
                                        const adj = selectedSale.discount_general.type === 'PERCENT'
                                            ? eligible * (selectedSale.discount_general.value / 100)
                                            : selectedSale.discount_general.value;

                                        return (
                                            <tr>
                                                <td colSpan={5} className={`px-4 py-2 text-right text-xs font-bold uppercase ${adj > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {adj > 0 ? 'Recargo' : 'Descuento General'} {selectedSale.discount_general.type === 'PERCENT' ? `(${Math.abs(selectedSale.discount_general.value)}%)` : ''}
                                                </td>
                                                <td className={`px-4 py-2 text-right font-bold ${adj > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {adj > 0 ? '+' : ''}{formatMoney(adj)}
                                                </td>
                                            </tr>
                                        )
                                    })()}
                                    {selectedSale.surcharge_general && (() => {
                                        const eligible = selectedSale.sale_items?.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0) || 0;
                                        const surcharge = selectedSale.surcharge_general.applied_amount
                                            || (selectedSale.surcharge_general.value
                                                ? eligible * (selectedSale.surcharge_general.value / 100)
                                                : 0);

                                        return (
                                            <tr>
                                                <td colSpan={5} className={`px-4 py-2 text-right text-xs font-bold uppercase ${surcharge > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                    {surcharge > 0 ? 'Recargo Cliente' : 'Descuento Cliente'} {selectedSale.surcharge_general.type === 'PERCENT' ? `(${Math.abs(selectedSale.surcharge_general.value)}%)` : ''}
                                                </td>
                                                <td className={`px-4 py-2 text-right font-bold ${surcharge > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                    {surcharge > 0 ? '+' : ''}{formatMoney(surcharge)}
                                                </td>
                                            </tr>
                                        )
                                    })()}
                                    {selectedSale.manual_tax_added && (() => {
                                        const { vat } = (selectedSale.items || []).reduce((acc: any, item: any) => {
                                            const taxRate = item.tax_rate ?? 0;
                                            const gross = item.unit_price;
                                            const net = gross / (1 + taxRate / 100);
                                            return { vat: acc.vat + ((gross - net) * item.quantity) }
                                        }, { vat: 0 });

                                        if (vat < 0.01) return null;

                                        return (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-2 text-right text-xs font-bold text-blue-600 uppercase">IVA Agregado</td>
                                                <td className="px-4 py-2 text-right text-blue-600 font-bold">
                                                    +{formatMoney(vat)}
                                                </td>
                                            </tr>
                                        )
                                    })()}
                                    {selectedSale.rounding_difference !== 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Redondeo</td>
                                            <td className="px-4 py-2 text-right text-slate-700 font-bold">
                                                {selectedSale.rounding_difference > 0 ? '+' : ''}{formatMoney(selectedSale.rounding_difference || 0)}
                                            </td>
                                        </tr>
                                    )}
                                    {selectedSale.invoice_letter === 'A' && selectedSale.fiscal_data && (
                                        <>
                                            <tr className="border-t border-slate-100">
                                                <td colSpan={5} className="px-4 py-1 text-right text-xs font-bold text-purple-600 uppercase">Neto Gravado (21%)</td>
                                                <td className="px-4 py-1 text-right text-purple-600 font-medium">{formatMoney(selectedSale.fiscal_data.net_amount)}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan={5} className="px-4 py-1 text-right text-xs font-bold text-purple-600 uppercase">IVA (21%)</td>
                                                <td className="px-4 py-1 text-right text-purple-600 font-medium">{formatMoney(selectedSale.fiscal_data.vat_amount)}</td>
                                            </tr>
                                        </>
                                    )}
                                    <tr className="border-t border-slate-200">
                                        <td colSpan={5} className="px-4 py-3 text-right text-sm font-black text-slate-900 uppercase">Total Final</td>
                                        <td className="px-4 py-3 text-right text-indigo-600 text-xl font-black">{formatMoney(selectedSale.total_amount)}</td>
                                    </tr>
                                </tfoot>
                            </table>

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
            )}

            {selectedMovement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-semibold text-lg">Detalle de Movimiento</h3>
                            <button onClick={() => setSelectedMovement(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {!selectedMovement.items || selectedMovement.items.length === 0 ? (
                                <div className="text-center py-10 space-y-4">
                                    {selectedMovement.status === 'cancelled' && (
                                        <div className="w-full bg-red-50 border-2 border-dashed border-red-200 text-red-500 font-black text-center py-4 mb-6 rounded-xl uppercase tracking-[0.2em] text-sm">
                                            Anulado / Cancelado
                                        </div>
                                    )}
                                    <div className="text-slate-500 font-mono text-sm uppercase">{format(selectedMovement.date, "dd/MM/yyyy HH:mm")}</div>
                                    <h2 className="text-3xl font-black text-slate-900">{selectedMovement.detail || 'Sin descripción'}</h2>

                                    <div className="inline-block px-4 py-2 bg-slate-100 rounded-xl">
                                        <p className={`text-xl font-bold ${selectedMovement.isEgreso ? 'text-red-600' : 'text-emerald-600'}`}>{selectedMovement.isEgreso ? '-' : '+'}{formatMoney(selectedMovement.amount)}</p>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedMovement.type}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4 flex justify-between items-start gap-4">
                                        <div className="text-sm text-slate-600 space-y-1">
                                            <p><strong>Fecha:</strong> {new Date(selectedMovement.date).toLocaleString()}</p>
                                            <p><strong>Cliente:</strong> {selectedMovement.customer}</p>
                                            <p><strong>Comprobante:</strong> {selectedMovement.invoice_letter === 'A' ? 'Factura A' : selectedMovement.invoice_letter === 'B' ? 'Factura B' : 'Ticket'}</p>
                                            <p><strong>N° Ticket:</strong> {selectedMovement.ticket_number || '---'}</p>

                                        </div>
                                        {selectedMovement.status === 'cancelled' && (
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
                                            {selectedMovement.items?.map((item: any, idx: number) => (
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
                                                            {item.product_details?.category_ids?.map((c: any) => (
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
                                        <tfoot className="border-t bg-slate-50/50">
                                            <tr>
                                                <td colSpan={5} className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Subtotal</td>
                                                <td className="px-4 py-2 text-right text-slate-700 font-bold">
                                                    {formatMoney(selectedMovement.items?.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0) || 0)}
                                                </td>
                                            </tr>
                                            {selectedMovement.discount_general && (() => {
                                                const eligible = selectedMovement.items?.reduce((acc: number, item: any) => {
                                                    if (item.exclude_from_general_discount) return acc;
                                                    return acc + (item.unit_price * item.quantity);
                                                }, 0) || 0;
                                                const adj = selectedMovement.discount_general.type === 'PERCENT'
                                                    ? eligible * (selectedMovement.discount_general.value / 100)
                                                    : selectedMovement.discount_general.value;

                                                return (
                                                    <tr>
                                                        <td colSpan={5} className={`px-4 py-2 text-right text-xs font-bold uppercase ${adj > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                            {adj > 0 ? 'Recargo' : 'Descuento General'} {selectedMovement.discount_general.type === 'PERCENT' ? `(${Math.abs(selectedMovement.discount_general.value)}%)` : ''}
                                                        </td>
                                                        <td className={`px-4 py-2 text-right font-bold ${adj > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                            {adj > 0 ? '+' : ''}{formatMoney(adj)}
                                                        </td>
                                                    </tr>
                                                )
                                            })()}
                                            {selectedMovement.surcharge_general && (() => {
                                                const eligible = selectedMovement.items?.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0) || 0;
                                                const surcharge = selectedMovement.surcharge_general.applied_amount
                                                    || (selectedMovement.surcharge_general.value
                                                        ? eligible * (selectedMovement.surcharge_general.value / 100)
                                                        : 0);

                                                return (
                                                    <tr>
                                                        <td colSpan={5} className={`px-4 py-2 text-right text-xs font-bold uppercase ${surcharge > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                            {surcharge > 0 ? 'Recargo Cliente' : 'Descuento Cliente'} {selectedMovement.surcharge_general.type === 'PERCENT' ? `(${Math.abs(selectedMovement.surcharge_general.value)}%)` : ''}
                                                        </td>
                                                        <td className={`px-4 py-2 text-right font-bold ${surcharge > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                            {surcharge > 0 ? '+' : ''}{formatMoney(surcharge)}
                                                        </td>
                                                    </tr>
                                                )
                                            })()}
                                            {selectedMovement.manual_tax_added && (() => {
                                                const { vat } = (selectedMovement.items || []).reduce((acc: any, item: any) => {
                                                    const taxRate = item.tax_rate ?? 0;
                                                    const gross = item.unit_price;
                                                    const net = gross / (1 + taxRate / 100);
                                                    return { vat: acc.vat + ((gross - net) * item.quantity) }
                                                }, { vat: 0 });

                                                if (vat < 0.01) return null;

                                                return (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-2 text-right text-xs font-bold text-blue-600 uppercase">IVA Agregado</td>
                                                        <td className="px-4 py-2 text-right text-blue-600 font-bold">
                                                            +{formatMoney(vat)}
                                                        </td>
                                                    </tr>
                                                )
                                            })()}
                                            {selectedMovement.rounding_difference !== 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Redondeo</td>
                                                    <td className="px-4 py-2 text-right text-slate-700 font-bold">
                                                        {selectedMovement.rounding_difference > 0 ? '+' : ''}{formatMoney(selectedMovement.rounding_difference || 0)}
                                                    </td>
                                                </tr>
                                            )}
                                            {selectedMovement.invoice_letter === 'A' && selectedMovement.fiscal_data && (() => {
                                                const safeNet = (selectedMovement.fiscal_data.net_amount && !isNaN(selectedMovement.fiscal_data.net_amount)) ? selectedMovement.fiscal_data.net_amount : (selectedMovement.amount / 1.21);
                                                const safeVat = (selectedMovement.fiscal_data.vat_amount && !isNaN(selectedMovement.fiscal_data.vat_amount)) ? selectedMovement.fiscal_data.vat_amount : (selectedMovement.amount - safeNet);
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
                                                <td className="px-4 py-3 text-right text-indigo-600 text-xl font-black">{formatMoney(selectedMovement.amount)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>

                                    <div className="mt-6 border-t pt-6">
                                        <h4 className="text-xs font-black uppercase text-slate-500 mb-3">Métodos de Pago</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {selectedMovement.payments?.map((p: any, idx: number) => {
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
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function ManualForm({ orgId, registerId, sessionId, slug, onDone }: any) {
    const [val, setVal] = useState('');
    const [desc, setDesc] = useState('');
    const [type, setType] = useState<'IN' | 'OUT'>('OUT');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [pending, setPending] = useState(false);

    const save = async () => {
        if (!val) return toast.error("Ingrese un monto");
        setPending(true);
        // Pass paymentMethod to the action
        const res = await registerCashMovement(orgId, registerId, sessionId, type, Math.abs(parseFloat(val)), desc || '', paymentMethod, slug);
        setPending(false);
        if (res.error) toast.error(res.error); else onDone();
    }

    const methods = [
        { id: 'cash', label: 'Efectivo', icon: Banknote },
        { id: 'transfer', label: 'Transferencia', icon: ArrowRightLeft },
        { id: 'credit_card', label: 'Tarjeta de Crédito', icon: CreditCard },
        { id: 'debit_card', label: 'Tarjeta de Débito', icon: CreditCard },
        { id: 'check', label: 'Cheque', icon: Banknote }
    ];

    return (
        <div className="space-y-4 pt-2 text-slate-900">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo de Movimiento</label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 font-bold">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="OUT" className="font-bold text-red-600">Gasto / Egreso</SelectItem>
                        <SelectItem value="IN" className="font-bold text-emerald-600">Ingreso</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Monto ($)</label>
                    <Input
                        type="number"
                        placeholder="0.00"
                        value={val}
                        onChange={e => setVal(e.target.value)}
                        className="text-xl h-11 text-center font-black bg-slate-100 border-none shadow-inner rounded-xl"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Método de Pago</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {methods.map(m => (
                                <SelectItem key={m.id} value={m.id} className="font-bold">
                                    <div className="flex items-center gap-2">
                                        <m.icon size={14} className="text-slate-400" />
                                        {m.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descripción</label>
                <Input placeholder="Ej: Pago de flete..." value={desc} onChange={e => setDesc(e.target.value)} className="font-medium h-11 rounded-xl bg-slate-50/50 border-slate-200" />
            </div>

            <Button onClick={save} disabled={pending} className={cn("w-full h-14 rounded-2xl font-bold uppercase text-white shadow-xl transition-all mt-4", type === 'IN' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}>
                {pending ? <Loader2 className="animate-spin" /> : "Guardar Registro"}
            </Button>
        </div>
    )
}

function MetricBox({ title, value, color, icon, onClick }: any) {
    const colors: any = { green: "border-l-green-500", red: "border-l-red-500", zinc: "border-l-slate-900", pink: "border-l-pink-500" };
    return (
        <div onClick={onClick} className={cn("bg-white border border-slate-200 rounded-2xl shadow-sm border-l-4 cursor-pointer p-5 hover:bg-slate-50 transition-all active:scale-95 group", colors[color])}>
            <div className="flex justify-between items-start mb-2"><span className="text-[10px] uppercase font-black text-slate-400 tracking-widest group-hover:text-slate-600 transition-colors">{title}</span>{icon}</div>
            <p className="text-2xl font-black text-slate-800">{typeof value === 'number' ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value) : value}</p>
        </div>
    );
}
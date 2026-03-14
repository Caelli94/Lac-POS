'use client';

import { Button } from "@/components/ui/button";
import { Printer, CheckCircle, ArrowRight, X } from "lucide-react";
import { printTicket } from "@/utils/printTicket";
// import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// CORRECCIÓN 1: Ajustamos la interfaz a lo que devuelve Supabase realmente
interface SaleData {
    id: string;
    total_amount: number;
    sale_items?: any[];
    items?: any[];
    payment_method: string;
    created_at: string;
    invoice_letter?: string;
    fiscal_data?: any;
    afip_data?: {
        cae: string;
        cae_expiration: string;
        cbte_nro: number;
        cbte_tipo: number;
    }
}

interface Props {
    sale: SaleData | null;
    orgId: string;
    onClose: () => void;
    org?: any;
    ticketSettings?: any;
}

export default function SaleSummary({ sale, orgId, onClose, org, ticketSettings }: Props) {
    const [loadingPrint, setLoadingPrint] = useState(false);
    const [loadingFiscal, setLoadingFiscal] = useState(false);
    // Local state for sale to update it when fiscalized without refetching parent
    const [currentSale, setCurrentSale] = useState<SaleData | null>(sale);

    useEffect(() => {
        setCurrentSale(sale);
    }, [sale]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!currentSale) return null;

    // CORRECCIÓN 2: Unificamos datos para evitar errores de "undefined"
    const totalSafe = currentSale.total_amount || 0;
    const itemsSafe = currentSale.sale_items || currentSale.items || [];

    const handleFiscalize = async () => {
        try {
            setLoadingFiscal(true);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api'}/afip/invoice/${currentSale.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Error al fiscalizar');
            }

            const data = await res.json();
            // Update local sale with new AFIP data
            if (data.data?.afip_data) {
                setCurrentSale(prev => prev ? { ...prev, afip_data: data.data.afip_data } : null);
                toast.success(`CAE Generado: ${data.data.afip_data.cae}`);
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error de comunicación con AFIP");
        } finally {
            setLoadingFiscal(false);
        }
    };

    const handlePrint = async () => {
        try {
            setLoadingPrint(true);

            const ticketConfig = {
                headerText: ticketSettings?.header_text || '',
                footerText: ticketSettings?.footer_text || '',
                width: (ticketSettings?.printer_width || '80mm') as '80mm' | '58mm',
            };

            const orgData = {
                name: ticketSettings?.business_name || org?.name || 'Mi Negocio',
                address: ticketSettings?.address || org?.address || '',
                taxId: ticketSettings?.tax_id || org?.tax_id || '',
                logoUrl: undefined
            };

            printTicket({
                organization: orgData,
                sale: {
                    id: currentSale.id,
                    ticketNumber: (currentSale as any).ticket_number || (currentSale.id ? currentSale.id.slice(-6).toUpperCase() : '---'),
                    date: currentSale.created_at,
                    items: itemsSafe.map((i: any) => ({
                        name: i.product_name || i.name,
                        quantity: i.quantity,
                        price: i.unit_price || i.price,
                        variant_name: i.variant_name || i.product_variant_name
                    })),
                    total: totalSafe,
                    paymentMethod: currentSale.payment_method,
                    invoiceLetter: currentSale.invoice_letter,
                    fiscalData: currentSale.fiscal_data,
                    // Pass afip data for printing if available
                    // We might need to update printTicket interface if it doesn't support CAE yet.
                    // Assuming printTicket handles generic object or we pass explicit fields.
                    // Let's pass it in fiscalData as a merge or look for updated printTicket.
                    // For now, let's assume printTicket uses fiscalData for CUIT and we can inject CAE there if needed?
                    // Actually, let's check printTicket later. For now, print what we have.
                    // Injecting CAE into fiscalData structure for compatibility if needed:
                    ...(currentSale.afip_data ? {
                        cae: currentSale.afip_data.cae,
                        caeExpiration: currentSale.afip_data.cae_expiration
                    } : {})
                },
                settings: ticketConfig
            });

        } catch (error) {
            console.error("Error al imprimir:", error);
            toast.error("No se pudo generar el ticket.");
        } finally {
            setLoadingPrint(false);
        }
    };

    const isFiscal = currentSale.invoice_letter === 'A' || currentSale.invoice_letter === 'B' || currentSale.invoice_letter === 'C';
    const hasCae = !!currentSale.afip_data?.cae;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-white/60 hover:text-white z-10 p-1 hover:bg-white/20 rounded-full transition-all">
                    <X size={20} />
                </button>

                {/* Cabecera Éxito */}
                <div className="bg-green-600 p-6 text-center text-white">
                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold">¡Venta Exitosa!</h2>
                    <p className="text-green-100">La operación se registró correctamente.</p>
                </div>

                {/* Detalles */}
                <div className="p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <p className="text-sm text-gray-500 uppercase tracking-wide">Total Cobrado</p>
                        <p className="text-4xl font-bold text-gray-900">
                            ${totalSafe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>

                        {/* Estado Fiscal */}
                        {isFiscal && hasCae && (
                            <div className="bg-green-50 text-green-700 px-3 py-1 rounded inline-block text-xs font-bold border border-green-200">
                                CAE: {currentSale.afip_data?.cae}
                            </div>
                        )}
                        {isFiscal && !hasCae && (
                            <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded inline-block text-xs font-bold border border-amber-200">
                                Pendiente de Fiscalización
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {/* Botón Fiscalizar (Solo si es fiscal y no tiene CAE) */}
                        {isFiscal && !hasCae && (
                            <Button
                                onClick={handleFiscalize}
                                disabled={loadingFiscal}
                                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-wide shadow-lg shadow-amber-500/20"
                            >
                                {loadingFiscal ? 'Generando CAE...' : 'Fiscalizar Ahora en AFIP'}
                            </Button>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={handlePrint}
                                variant="outline"
                                className="h-12 border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-700 font-semibold gap-2"
                                disabled={loadingPrint}
                            >
                                <Printer size={20} />
                                {loadingPrint ? 'Generando...' : 'Imprimir Ticket'}
                            </Button>

                            <Button
                                onClick={onClose}
                                className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
                            >
                                Nueva Venta
                                <ArrowRight size={20} />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-3 text-center text-xs text-gray-400">
                    ID: {currentSale.id.slice(0, 8)}... | {currentSale.invoice_letter || 'X'}
                </div>
            </div>
        </div>
    );
}
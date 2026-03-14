
'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

interface FiscalSelectorProps {
    customer: any;
    totalAmount: number;
    onInvoiceChange: (data: { type: string, letter: string, fiscalData?: any }) => void;
}

export function FiscalSelector({ customer, totalAmount, onInvoiceChange }: FiscalSelectorProps) {
    const [selectedType, setSelectedType] = useState<string>('ticket');

    // Reset to B if customer changes and is invalid for A
    useEffect(() => {
        if (selectedType === 'invoice_a' && !customer?.tax_id) {
            setSelectedType('invoice_b');
            toast.warning("Se cambió a Factura B porque el cliente no tiene CUIT.");
        }
    }, [customer, selectedType]);

    // Calculate Fiscal Data
    useEffect(() => {
        let fiscalData = null;
        let invoiceLetter = 'X';
        let docType = 'ticket';

        switch (selectedType) {
            case 'ticket':
                docType = 'ticket'; invoiceLetter = 'X'; break;
            case 'invoice_b':
                docType = 'invoice'; invoiceLetter = 'B'; break;
            case 'invoice_a':
                docType = 'invoice'; invoiceLetter = 'A'; break;
            case 'credit_note':
                docType = 'credit_note'; invoiceLetter = 'X'; break;
            case 'quote':
                docType = 'quote'; invoiceLetter = 'X'; break;
            case 'delivery_note':
                docType = 'delivery_note'; invoiceLetter = 'X'; break;
        }

        if (selectedType === 'invoice_a') {
            const safeTotal = Number(totalAmount) || 0;
            const net = safeTotal / 1.21;
            const vat = safeTotal - net;
            fiscalData = {
                cuit: customer?.tax_id || '',
                legal_name: customer?.name || '',
                address: customer?.address || '',
                vat_condition: customer?.vat_condition || 'Responsable Inscripto',
                net_amount: parseFloat(net.toFixed(2)),
                vat_amount: parseFloat(vat.toFixed(2)),
                tax_breakdown: [{ rate: 21, base_amount: parseFloat(net.toFixed(2)), tax_amount: parseFloat(vat.toFixed(2)) }]
            };
        }

        onInvoiceChange({ type: docType, letter: invoiceLetter, fiscalData });

    }, [selectedType, totalAmount, customer]);

    const hasCuit = customer && (customer.tax_id && customer.tax_id.length >= 10);

    return (
        <div className="space-y-2">
            <Select value={selectedType} onValueChange={(val) => {
                if (val === 'invoice_a' && !hasCuit) {
                    toast.error("El cliente debe tener CUIT para Factura A");
                    return;
                }
                setSelectedType(val);
            }}>
                <SelectTrigger className="w-full h-10 bg-white border-slate-200 font-medium text-xs">
                    <SelectValue placeholder="Comprobante" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ticket">Ticket (Consumidor Final)</SelectItem>
                    <SelectItem value="invoice_b">Factura B (Cons. Final)</SelectItem>
                    <SelectItem value="invoice_a" disabled={!hasCuit}>
                        <div className="flex justify-between items-center w-full gap-2">
                            <span>Factura A (Resp. Insc.)</span>
                            {!hasCuit && <Lock size={12} className="opacity-50" />}
                        </div>
                    </SelectItem>
                    <SelectItem value="credit_note">Nota de Crédito</SelectItem>
                    <SelectItem value="quote">Presupuesto</SelectItem>
                    <SelectItem value="delivery_note">Remito</SelectItem>
                </SelectContent>
            </Select>


        </div>
    );
}


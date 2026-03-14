import React, { useMemo } from 'react';
import { X, Banknote, CreditCard, ArrowRightLeft, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SaleDetailModalProps {
    sale: any;
    isOpen: boolean;
    onClose: () => void;
}

export function SaleDetailModal({ sale, isOpen, onClose }: SaleDetailModalProps) {
    // If we use ShadCN Dialog, we don't need to manually check isOpen for null return usually,
    // but the Dialog requires an 'open' prop. The 'sale' might be null when closing.
    // So we handle safe access or only render content if sale exists.

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    const financials = useMemo(() => {
        if (!sale) return null;

        const subtotal = sale.sale_items?.reduce((acc: number, item: any) => {
            return acc + (item.unit_price * item.quantity);
        }, 0) || 0;

        let adjustment = 0;
        if (sale.discount_general) {
            const eligible = sale.sale_items?.reduce((acc: number, item: any) => {
                if (item.exclude_from_general_discount) return acc;
                return acc + (item.unit_price * item.quantity);
            }, 0) || 0;

            if (sale.discount_general.type === 'PERCENT') {
                adjustment = eligible * (sale.discount_general.value / 100);
            } else {
                adjustment = sale.discount_general.value;
            }
        }

        let surcharge = 0;
        if (sale.surcharge_general) {
            surcharge = sale.surcharge_general.applied_amount || 0;
            if (!surcharge && sale.surcharge_general.value) {
                surcharge = subtotal * (sale.surcharge_general.value / 100);
            }
        }

        let vatAmount = 0;
        let finalSubtotal = subtotal;

        if (sale.manual_tax_added) {
            const calculated = sale.sale_items?.reduce((acc: any, item: any) => {
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
            rounding: sale.rounding_difference || 0,
            total: sale.total_amount
        };
    }, [sale]);

    if (!sale) return null; // Or render empty Dialog, but better to not render if no sale is selected.

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-white">
                <DialogHeader className="bg-slate-50 px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="font-semibold text-lg uppercase tracking-tight text-slate-900">Detalle de Venta</DialogTitle>
                </DialogHeader>

                <div className="p-6 overflow-y-auto">
                    <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between items-start gap-4">
                        <div className="text-sm text-slate-600 space-y-1">
                            <p><strong>Fecha:</strong> {new Date(sale.date || sale.created_at).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                            <p><strong>Cliente:</strong> {sale.customers?.name || 'Cliente Final'}</p>
                            <p><strong>Comprobante:</strong> {sale.invoice_letter === 'A' ? 'Factura A' : sale.invoice_letter === 'B' ? 'Factura B' : 'Ticket'}</p>
                            <p><strong>N° Ticket:</strong> {sale.ticket_number || '---'}</p>
                        </div>
                        {sale.status === 'cancelled' && (
                            <div className="border-2 border-dashed border-red-200 bg-red-50 text-red-500 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-sm text-center">
                                Anulado / Cancelado
                            </div>
                        )}
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                            <tr className="border-b border-slate-100">
                                <th className="px-4 py-3 text-left w-1/4">Producto</th>
                                <th className="px-4 py-3 text-left w-1/5">Proveedor</th>
                                <th className="px-4 py-3 text-left w-1/5">Rubros</th>
                                <th className="px-4 py-3 text-center">Cant.</th>
                                <th className="px-4 py-3 text-right">Unitario</th>
                                <th className="px-4 py-3 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sale.sale_items?.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="px-4 py-3 text-slate-700 font-medium align-top">
                                        <div className="flex flex-col">
                                            <span>{item.product_name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{item.product_details?.sku || ''}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top text-xs text-slate-600">{item.product_details?.supplier?.name || '---'}</td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex flex-wrap gap-1">
                                            {item.product_details?.category_ids?.map((c: any, i: number) => (
                                                <span key={c._id || i} className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded border border-slate-200">{c.name}</span>
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
                                    {formatMoney(financials?.subtotal || 0)}
                                </td>
                            </tr>
                            {financials && Math.abs(financials.adjustment) >= 0.01 && (
                                <tr>
                                    <td colSpan={5} className={`px-4 py-2 text-right text-xs font-bold uppercase ${financials.adjustment > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {financials.adjustment > 0 ? 'Recargo' : 'Descuento General'} {sale.discount_general?.type === 'PERCENT' ? `(${Math.abs(sale.discount_general.value)}%)` : ''}
                                    </td>
                                    <td className={`px-4 py-2 text-right font-bold ${financials.adjustment > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {financials.adjustment > 0 ? '+' : ''}{formatMoney(financials.adjustment)}
                                    </td>
                                </tr>
                            )}
                            {financials && Math.abs(financials.surcharge) >= 0.01 && (
                                <tr>
                                    <td colSpan={5} className={`px-4 py-2 text-right text-xs font-bold uppercase ${financials.surcharge > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                        {financials.surcharge > 0 ? 'Recargo Cliente' : 'Descuento Cliente'} {sale.surcharge_general?.type === 'PERCENT' ? `(${Math.abs(sale.surcharge_general.value)}%)` : ''}
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
                            {sale.invoice_letter === 'A' && sale.fiscal_data && (() => {
                                const total = financials?.total || 0;
                                const safeNet = (sale.fiscal_data.net_amount && !isNaN(sale.fiscal_data.net_amount)) ? sale.fiscal_data.net_amount : (total / 1.21);
                                const safeVat = (sale.fiscal_data.vat_amount && !isNaN(sale.fiscal_data.vat_amount)) ? sale.fiscal_data.vat_amount : (total - safeNet);
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
                                );
                            })()}
                            <tr className="border-t border-slate-200">
                                <td colSpan={5} className="px-4 py-3 text-right text-sm font-black text-slate-900 uppercase">Total Final</td>
                                <td className="px-4 py-3 text-right text-indigo-600 text-xl font-black">{formatMoney(financials?.total || 0)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Payment Methods Breakdown */}
                    <div className="mt-6 border-t pt-6 pb-6">
                        <h4 className="text-xs font-black uppercase text-slate-500 mb-3 ml-6">Métodos de Pago</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6">
                            {sale.payments?.map((p: any, idx: number) => {
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
                </div>
            </DialogContent>
        </Dialog>
    );
}

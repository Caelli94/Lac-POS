import React, { useMemo } from 'react';
import { X, Banknote, CreditCard, ArrowRightLeft, Wallet, ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PurchaseDetailModalProps {
    purchase: any;
    isOpen: boolean;
    onClose: () => void;
}

export function PurchaseDetailModal({ purchase, isOpen, onClose }: PurchaseDetailModalProps) {
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    const financials = useMemo(() => {
        if (!purchase) return null;

        const subtotal = purchase.purchase_items?.reduce((acc: number, item: any) => {
            return acc + (item.unit_cost * item.quantity);
        }, 0) || 0;

        return {
            subtotal,
            total: purchase.total_amount
        };
    }, [purchase]);

    if (!purchase) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-white">
                <DialogHeader className="bg-slate-50 px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="font-semibold text-lg uppercase tracking-tight text-slate-900">Detalle de Compra</DialogTitle>
                </DialogHeader>

                <div className="p-6 overflow-y-auto">
                    <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between items-start gap-4">
                        <div className="text-sm text-slate-600 space-y-1">
                            <p><strong>Fecha:</strong> {new Date(purchase.date || purchase.created_at).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                            <p><strong>Proveedor:</strong> {purchase.supplier?.name || '---'}</p>
                            <p><strong>Comprobante:</strong> {purchase.invoice_type || '---'} {purchase.invoice_number ? '#' + purchase.invoice_number : ''}</p>
                        </div>
                        {purchase.status === 'cancelled' && (
                            <div className="border-2 border-dashed border-red-200 bg-red-50 text-red-500 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-sm text-center">
                                Anulado / Cancelado
                            </div>
                        )}
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                            <tr className="border-b border-slate-100">
                                <th className="px-4 py-3 text-left w-1/4">Producto</th>
                                <th className="px-4 py-3 text-left w-1/5">Rubros</th>
                                <th className="px-4 py-3 text-center">Cant.</th>
                                <th className="px-4 py-3 text-right">Costo Unit.</th>
                                <th className="px-4 py-3 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {purchase.purchase_items?.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="px-4 py-3 text-slate-700 font-medium align-top">
                                        <div className="flex flex-col">
                                            <span>{item.product_name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{item.product_details?.sku || ''}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex flex-wrap gap-1">
                                            {item.product_details?.categories?.map((c: any) => (
                                                <span key={c._id} className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded border border-slate-200">{c.name}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-400 align-top">x{item.quantity}</td>
                                    <td className="px-4 py-3 text-right text-slate-500 align-top">{formatMoney(item.unit_cost)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-700 align-top">{formatMoney(item.unit_cost * item.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t bg-slate-50/50">
                            <tr>
                                <td colSpan={4} className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Total Estimado</td>
                                <td className="px-4 py-2 text-right text-slate-700 font-bold">
                                    {formatMoney(financials?.subtotal || 0)}
                                </td>
                            </tr>
                            <tr className="border-t border-slate-200">
                                <td colSpan={4} className="px-4 py-3 text-right text-sm font-black text-slate-900 uppercase">Total Final</td>
                                <td className="px-4 py-3 text-right text-indigo-600 text-xl font-black">{formatMoney(purchase.total_amount || financials?.subtotal || 0)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Payment Info */}
                    <div className="mt-6 border-t pt-6 pb-6">
                        <h4 className="text-xs font-black uppercase text-slate-500 mb-3 ml-6">Método de Pago</h4>
                        <div className="px-6 flex items-center gap-3">
                            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                                <Wallet className="w-5 h-5 text-slate-600" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-slate-600 opacity-80">
                                        {purchase.payment_method === 'cash' ? 'Efectivo' :
                                            purchase.payment_method === 'transfer' ? 'Transferencia' :
                                                purchase.payment_method === 'check' ? 'Cheque' :
                                                    purchase.payment_method === 'account' ? 'Cuenta Corriente' :
                                                        'Otro'}
                                    </p>
                                    <p className="font-bold text-slate-900">{formatMoney(purchase.total_amount)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

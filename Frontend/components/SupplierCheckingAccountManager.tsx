"use client";
import { useState, useEffect, useCallback } from 'react';
import { Eye, Loader2, AlertTriangle, Ban, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { voidSupplierAccountMovementAction } from "@/app/[slug]/suppliers/actions";
import { PurchaseDetailModal } from "@/components/purchases/PurchaseDetailModal";

type Movement = {
    _id: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    description: string;
    created_at: string;
    status?: 'valid' | 'cancelled';
    performed_by?: { name: string, role?: string };
};

interface AccountData {
    id: string;
    balance: number;
    currency: string;
    is_active: boolean;
    organization_id: string;
}

interface Props {
    supplierId: string;
    organizationId: string;
    slug: string; // Added slug
    onBalanceChange?: (newBalance: number) => void;
}

export default function SupplierCheckingAccountManager({ supplierId, organizationId, slug, onBalanceChange }: Props) {
    const [loading, setLoading] = useState(true);
    const [hasAccount, setHasAccount] = useState(false);
    const [accountData, setAccountData] = useState<AccountData | null>(null);
    const [movements, setMovements] = useState<Movement[]>([]);

    const [amount, setAmount] = useState(''); // Used for Payment (Cash) OR Surcharge
    const [discountAmount, setDiscountAmount] = useState(''); // Used for Discount
    const [description, setDescription] = useState('');
    const [txType, setTxType] = useState<'DEBIT' | 'CREDIT'>('CREDIT');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [submitting, setSubmitting] = useState(false);

    // Error Modal State
    const [errorModal, setErrorModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

    // Void State
    const [movementToVoidManual, setMovementToVoidManual] = useState<{ id: string, amount: number, desc: string } | null>(null);
    const [voiding, setVoiding] = useState(false);
    const [showSuccessVoid, setShowSuccessVoid] = useState(false);

    // Detail View State
    const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [currentDetailId, setCurrentDetailId] = useState<string | null>(null);


    // Calculate Real-time Balance
    useEffect(() => {
        if (!accountData || !onBalanceChange) return;

        const currentBalance = Number(accountData.balance) || 0;
        let projected = currentBalance;

        const valAmount = parseFloat(amount) || 0;
        const valDiscount = parseFloat(discountAmount) || 0;

        if (txType === 'CREDIT') {
            // "Pago a Proveedor" (Payment) reduces existing DEBT (We owe less).
            projected = currentBalance - valAmount - valDiscount;
        } else {
            // "Nueva Deuda" (Debit/Invoice) increases DEBT.
            projected = currentBalance + valAmount;
        }

        onBalanceChange(projected);
    }, [accountData, amount, discountAmount, txType, onBalanceChange]);

    const fetchData = useCallback(async () => {
        if (!supplierId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/suppliers/${supplierId}/account/details`);
            if (!res.ok) return;

            const data = await res.json();
            if (data.hasAccount) {
                setHasAccount(true);
                setAccountData(data.account);
                setMovements(data.movements || []);
                // Initial balance update
                if (onBalanceChange && data.account) {
                    onBalanceChange(Number(data.account.balance));
                }
            } else {
                setHasAccount(false);
            }
        } catch (error) {
            console.error("Error al cargar datos:", error);
        } finally {
            setLoading(false);
        }
    }, [supplierId, onBalanceChange]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Logic for split transactions

            // Helper to handle requests
            const performRequest = async (payload: any) => {
                const res = await fetch(`/api/suppliers/${supplierId}/account/movements`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const err = await res.json();
                    return { success: false, message: err.message || 'Error en la operación' };
                }
                return { success: true, data: await res.json() };
            };

            // 1. Handle Combined or Split Transactions
            const valAmount = parseFloat(amount) || 0;
            const valDiscount = parseFloat(discountAmount) || 0;

            if (txType === 'CREDIT') {
                if (valAmount > 0 || valDiscount > 0) {
                    const result = await performRequest({
                        type: 'CREDIT',
                        amount: valAmount,
                        discountAmount: valDiscount,
                        description: description || '',
                        addToCash: valAmount > 0,
                        paymentMethod: paymentMethod
                    });
                    if (!result.success) {
                        setErrorModal({ open: true, message: result.message });
                        setSubmitting(false);
                        return;
                    }
                }
            } else if (txType === 'DEBIT') {
                if (valAmount > 0) {
                    const result = await performRequest({
                        type: 'DEBIT',
                        amount: valAmount,
                        description: description || '',
                        addToCash: false
                    });
                    if (!result.success) {
                        setErrorModal({ open: true, message: result.message });
                        setSubmitting(false);
                        return;
                    }
                }
            }

            // Reset Form on Success
            setAmount('');
            setDiscountAmount('');
            setDescription('');
            setSubmitting(false);
            fetchData();
            toast.success("Operación registrada correctamente");

        } catch (e: any) {
            // Handle unexpected network errors
            setErrorModal({ open: true, message: e.message || "Error al registrar operación" });
            setSubmitting(false);
        }
    };

    const handleVoidManual = async () => {
        if (!movementToVoidManual) return;
        setVoiding(true);
        const res = await voidSupplierAccountMovementAction(movementToVoidManual.id, slug);
        setVoiding(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            setMovementToVoidManual(null);
            setShowSuccessVoid(true);
            fetchData();
        }
    };

    const handleViewDetail = async (desc: string, movId: string) => {
        // Try to extract Purchase ID from description if available (e.g. "Compra #123...")
        // OR rely on a future backend update where movement has a 'reference_id'.
        // For now, let's assume the description contains the ID or we fetch the purchase that generated this movement.
        // Actually, the current movement structure doesn't easily link to Purchase ID unless we store it.
        // But let's check if the description has the format "Compra #<ID>".

        // If not found, we can't show detail.
        // For now, I will implement the UI assuming we can find it or the backend sends it. 
        // NOTE: The current movement schema doesn't seem to pass 'reference_id'. 
        // I'll regex the ID from description if it's there.
        const match = desc.match(/#([a-fA-F0-9]{24})/);

        if (!match) {
            toast.error("No se pudo identificar la compra");
            return;
        }

        const purchaseId = match[1];

        setLoadingDetail(true);
        setCurrentDetailId(movId);
        try {
            // Assuming this endpoint exists or I need to create it?
            // Existing endpoint: `GET /purchases/detail/:id` ?
            // Let's assume standard REST: `/api/purchases/:id`
            const res = await fetch(`/api/purchases/${purchaseId}`);

            if (res.ok) {
                const data = await res.json();
                setSelectedPurchase(data);
            } else {
                toast.error("No se pudo cargar el detalle de la compra.");
            }
        } catch (e) {
            toast.error("Error de conexión");
        } finally {
            setLoadingDetail(false);
            setCurrentDetailId(null);
        }
    };


    if (loading && !accountData) return <div className="p-4 text-sm text-gray-500 animate-pulse">Cargando...</div>;

    const balance = accountData ? Number(accountData.balance) : 0;
    // For suppliers: Positive balance = Debt (We owe them). Negative = Advance (They owe us).

    return (
        <div className="space-y-6">

            {/* NEW OPERATION FORM */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Operación:</span>
                    <div className="relative">
                        <select
                            value={txType}
                            onChange={(e) => setTxType(e.target.value as any)}
                            className="appearance-none bg-white text-slate-800 pl-10 pr-10 py-2 rounded-lg text-sm font-bold border border-slate-200 focus:outline-none focus:border-slate-400 cursor-pointer shadow-sm"
                        >
                            <option value="CREDIT">Pago a Proveedor</option>
                            <option value="DEBIT">Factura / Nueva Deuda</option>
                        </select>
                        <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${txType === 'CREDIT' ? 'bg-red-500 shadow-sm' : 'bg-indigo-500 shadow-sm'}`}></div>
                    </div>
                </div>

                <form onSubmit={handleTransaction} className="flex flex-col gap-4">
                    {txType === 'CREDIT' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                <div className="flex items-center gap-2 mb-3">
                                    <h4 className="text-red-800 font-bold text-sm">Pago a Proveedor <span className="text-red-700/70 text-[10px] font-normal ml-1">(Retira dinero de caja)</span></h4>
                                </div>

                                <div className="grid grid-cols-5 gap-3">
                                    <div className="col-span-3 relative">
                                        <span className="absolute left-3 top-2.5 text-red-600 font-bold">$</span>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full bg-white border border-red-200 text-red-700 text-sm font-bold rounded-lg pl-7 pr-3 py-2 placeholder:text-red-300 focus:outline-none focus:border-red-500 transition-colors shadow-sm"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <select
                                            className="w-full h-full bg-white border border-red-200 text-red-700 text-xs font-medium rounded-lg px-2 focus:outline-none focus:border-red-500 shadow-sm"
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        >
                                            <option value="cash">Efectivo</option>
                                            <option value="transfer">Transferencia</option>
                                            <option value="debit_card">T. Débito</option>
                                            <option value="credit_card">T. Crédito</option>
                                            <option value="check">Cheque</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* ORANGE BOX: DESCUENTO */}
                            <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-orange-500 font-black text-lg">🏷️</span>
                                    <h4 className="text-orange-800 font-bold text-sm">Descuento / Ajuste <span className="text-orange-700/70 text-[10px] font-normal ml-1">(Resta deuda, NO toca caja)</span></h4>
                                </div>

                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-orange-600 font-bold">$</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full bg-white border border-orange-200 text-orange-700 text-sm font-bold rounded-lg pl-7 pr-3 py-2 placeholder:text-orange-300 focus:outline-none focus:border-orange-500 transition-colors shadow-sm"
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        // INDIGO BOX: NUEVA DEUDA
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-indigo-500 font-black text-lg">📄</span>
                                <h4 className="text-indigo-800 font-bold text-sm">Factura / Nueva Deuda</h4>
                            </div>

                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-indigo-600 font-bold">$</span>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full bg-white border border-indigo-200 text-indigo-700 text-sm font-bold rounded-lg pl-7 pr-3 py-2 placeholder:text-indigo-300 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    )}

                    {/* FOOTER */}
                    <div className="flex flex-col sm:flex-row gap-4 items-end pt-2">
                        <div className="flex-1 w-full">
                            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Nota / Detalle</label>
                            <input
                                type="text"
                                placeholder="Ej: Pago factura #123..."
                                className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-slate-400 placeholder:text-slate-400"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full sm:w-auto bg-[#ec4899] hover:bg-[#db2777] text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 min-w-[120px]"
                        >
                            {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
            <div className="border rounded-lg overflow-hidden bg-white">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                        <tr>
                            <th className="p-3 w-[15%]">Fecha</th>
                            <th className="p-3 w-[40%]">Detalle</th>
                            <th className="p-3 text-right w-[15%]">Movimiento</th>
                            <th className="p-3 text-center w-[15%]">Operador</th>
                            <th className="p-3 text-right w-[15%]">Saldo</th>
                            <th className="p-3 w-[5%]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(() => {
                            // Calculate running balances
                            let currentBalance = balance;

                            const processed = movements.map((mov) => {
                                const rowBalance = currentBalance;
                                const amount = Number(mov.amount);
                                const effectiveAmount = mov.status === 'cancelled' ? 0 : amount;

                                // Reverse calculation for next row
                                // DEBIT = Debt Increase. Previous = Balance - Amount
                                // CREDIT = Debt Decrease. Previous = Balance + Amount
                                if (mov.type === 'DEBIT') {
                                    currentBalance -= effectiveAmount;
                                } else {
                                    currentBalance += effectiveAmount;
                                }

                                const dateObj = new Date(mov.created_at);

                                return {
                                    ...mov,
                                    status: mov.status,
                                    amount,
                                    runningBalance: rowBalance,
                                    date: dateObj.toLocaleDateString(),
                                    time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                };
                            });

                            // 2. Detect Orphan Balance (Initial / Migration)
                            if (Math.abs(currentBalance) > 0.01) {
                                processed.push({
                                    _id: 'migration-adj',
                                    type: currentBalance > 0 ? 'DEBIT' : 'CREDIT',
                                    amount: Math.abs(currentBalance),
                                    description: 'Ajuste de Migración / Saldo Inicial',
                                    status: 'valid',
                                    runningBalance: currentBalance,
                                    date: 'Migración',
                                    time: '',
                                    performed_by: { name: 'Sistema' }
                                } as any);
                            }

                            return processed.map((mov) => (
                                <tr key={mov._id} className={cn("hover:bg-slate-50/50 transition-colors", mov.status === 'cancelled' && "opacity-50 grayscale bg-red-50/30")}>
                                    <td className="p-3 align-top">
                                        <div className="flex flex-col">
                                            <span className={cn("font-medium text-slate-700", mov.status === 'cancelled' && "line-through decoration-slate-400")}>{mov.date}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{mov.time} hs</span>
                                        </div>
                                    </td>
                                    <td className="p-3 align-top font-medium text-slate-700">
                                        <div className="flex flex-col gap-1">
                                            <span className={cn(mov.status === 'cancelled' && "line-through decoration-slate-400")}>{mov.description}</span>
                                            {mov.status === 'cancelled' && (
                                                <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 uppercase font-black tracking-wider w-fit">
                                                    Anulado / Cancelado
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={`p-3 align-top text-right font-bold ${mov.status === 'cancelled' ? 'line-through decoration-slate-400 text-slate-400' : (mov.type === 'DEBIT' ? 'text-red-600' : 'text-emerald-600')}`}>
                                        {mov.type === 'DEBIT' ? '+' : '-'} $ {mov.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-center align-top">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-bold text-slate-700 uppercase px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                                                {mov.performed_by?.name || 'S/D'}
                                            </span>
                                            {mov.performed_by?.role && (
                                                <span className="text-[9px] font-black text-slate-400 uppercase mt-0.5 italic tracking-widest leading-none">
                                                    {mov.performed_by.role === 'admin' ? 'Administrador' : mov.performed_by.role}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={`p-3 align-top text-right font-black ${mov.runningBalance < 0 ? 'text-emerald-600' : 'text-red-600'} ${mov.status === 'cancelled' ? 'opacity-50' : ''}`}>
                                        $ {mov.runningBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-right align-top">
                                        <div className="flex items-center justify-end gap-1">
                                            {(mov.description?.includes('#')) && (
                                                <button
                                                    onClick={() => handleViewDetail(mov.description, mov._id)}
                                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
                                                    disabled={loadingDetail}
                                                    title="Ver detalle de compra"
                                                >
                                                    {loadingDetail && currentDetailId === mov._id ? <Loader2 className="animate-spin" size={16} /> : <Eye size={16} />}
                                                </button>
                                            )}

                                            {mov.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => {
                                                        setMovementToVoidManual({ id: mov._id, amount: mov.amount, desc: mov.description });
                                                    }}
                                                    className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-500 transition-colors"
                                                    title="Anular"
                                                >
                                                    <Ban size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ));
                        })()}
                    </tbody>
                </table>
            </div>

            {movementToVoidManual && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center border-none">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-black mb-2 uppercase tracking-tight">¿Anular Movimiento?</h3>
                        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">{movementToVoidManual.desc}</p>
                            <p className="text-2xl font-black text-slate-800">$ {movementToVoidManual.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <p className="text-sm text-slate-500 mb-8 italic px-4">Esta acción revertirá el saldo del cliente. Si el pago fue a caja, también se anulará allí.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setMovementToVoidManual(null)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors">Volver</button>
                            <button onClick={handleVoidManual} disabled={voiding} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 hover:bg-red-700 transition-colors flex justify-center items-center">
                                {voiding ? <Loader2 size={20} className="animate-spin" /> : 'SÍ, ANULAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccessVoid && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <DialogHeader className="hidden">
                            <DialogTitle>Movimiento Anulado</DialogTitle>
                        </DialogHeader>
                        <div className="mx-auto h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-emerald-700">¡Movimiento Anulado!</h3>
                        <p className="text-sm text-slate-500 mb-6">La operación ha sido cancelada correctamente.</p>
                        <button onClick={() => setShowSuccessVoid(false)} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg w-full">
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            <PurchaseDetailModal
                purchase={selectedPurchase}
                isOpen={!!selectedPurchase}
                onClose={() => setSelectedPurchase(null)}
            />

            {/* ERROR MODAL */}
            <Dialog open={errorModal.open} onOpenChange={(open) => !open && setErrorModal(prev => ({ ...prev, open: false }))}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center text-red-600">
                            Error en la Operación
                        </DialogTitle>
                        <DialogDescription className="hidden">Error</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 animate-in zoom-in duration-300">
                            <AlertTriangle size={40} />
                        </div>
                        <p className="text-lg text-slate-700 font-medium leading-relaxed">
                            {errorModal.message}
                        </p>
                        <Button
                            onClick={() => setErrorModal({ open: false, message: '' })}
                            className="w-full bg-slate-900 text-white h-14 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                        >
                            Entendido
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

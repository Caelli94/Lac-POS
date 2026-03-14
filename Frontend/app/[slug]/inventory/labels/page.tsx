'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { requireFeature } from '@/lib/guards';
import { productService } from '@/services/productService';
import { settingsService } from '@/services/settingsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Printer, Plus, Trash2, ArrowLeft, Barcode as BarcodeIcon, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PrintLayout } from './print-layout';
import { updateProductBarcodeAction } from '../new/actions';

export default function LabelPrintingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [org, setOrg] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Products search results
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Print Queue: Array of { product, quantity }
    const [printQueue, setPrintQueue] = useState<any[]>([]);

    // Barcode Auto-Gen State
    const [isBarcodeAlertOpen, setIsBarcodeAlertOpen] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const orgData = await settingsService.getOrganizationBySlug(slug);
                if (!orgData) {
                    console.error("Organization not found for slug:", slug);
                    return;
                }

                const hasInventory = orgData.features?.some((f: any) => f.code === 'inventory' && f.is_enabled);
                if (!hasInventory) {
                    console.error("Inventory feature disabled");
                    router.push('/dashboard'); // Or home
                    return;
                }

                setOrg(orgData);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [slug, router]);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.trim().length > 1 && org) {
                setIsSearching(true);
                try {
                    // Need to implement a search endpoint or filter client side if we fetch all.
                    // For now, let's assuming we fetch all and filter client side for better UX if list is < 1000, 
                    // BUT efficiently we should filter. 
                    // Re-using getAll for now as it is what we have.
                    // Re-using getAll for now as it is what we have.
                    const response = await productService.getAll(org.id);
                    const allProducts = response.data || []; // Handle paginated response structure
                    const filtered = allProducts.filter((p: any) =>
                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (p.barcode && p.barcode.includes(searchTerm))
                    ).slice(0, 5); // Limit to top 5
                    setSearchResults(filtered);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, org]);

    const addToQueue = (product: any, variant: any = null) => {
        // Validation: Must have barcode
        const targetBarcode = variant ? variant.barcode : product.barcode;
        if (!targetBarcode) {
            setPendingProduct(variant ? { ...product, variantSelected: variant } : product);
            setIsBarcodeAlertOpen(true);
            return;
        }

        const uniqueId = variant ? `${product.id}-${variant._id || variant.id || variant.tempId}` : product.id;

        setPrintQueue(prev => {
            const existing = prev.find(item => (item.variant ? `${item.product.id}-${item.variant._id || item.variant.id || item.variant.tempId}` : item.product.id) === uniqueId);
            if (existing) {
                return prev.map(item => (item.variant ? `${item.product.id}-${item.variant._id || item.variant.id || item.variant.tempId}` : item.product.id) === uniqueId ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, variant, quantity: 1 }];
        });
        setSearchTerm(''); // Clear search on select
        setSearchResults([]);
    };

    const handleGenerateConfirm = async () => {
        if (!pendingProduct) return;
        setIsGenerating(true);

        // Generate Barcode Logic
        const format = org?.barcodeSettings?.defaultFormat || 'CODE128';
        let newCode = '';
        if (format === 'EAN13') {
            newCode = '779' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
            // Check Digit
            let sum = 0;
            for (let i = 0; i < 12; i++) {
                sum += parseInt(newCode[i]) * (i % 2 === 0 ? 1 : 3);
            }
            const check = (10 - (sum % 10)) % 10;
            newCode += check;
        } else {
            // Random 12 chars for Code128
            const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            for (let i = 0; i < 12; i++) newCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        let res;
        if (pendingProduct.variantSelected) {
            // It's a variant. We need to update the variant barcode in the product.
            const updatedVariants = pendingProduct.variants.map((v: any) =>
                (v._id || v.id || v.tempId) === (pendingProduct.variantSelected._id || pendingProduct.variantSelected.id || pendingProduct.variantSelected.tempId)
                    ? { ...v, barcode: newCode }
                    : v
            );

            // Using createProductAction to update or a specialized update variant barcode action if it exists.
            // Since updateProductBarcodeAction probably only handles the main product, 
            // we'll assume the goal is to update the product object.
            res = await updateProductBarcodeAction(org.id, slug, pendingProduct.id, newCode, pendingProduct.variantSelected._id || pendingProduct.variantSelected.id || pendingProduct.variantSelected.tempId);
        } else {
            res = await updateProductBarcodeAction(org.id, slug, pendingProduct.id, newCode);
        }

        if (res.success) {
            toast.success(`Código generado: ${newCode}`);

            if (pendingProduct.variantSelected) {
                const updatedVariant = { ...pendingProduct.variantSelected, barcode: newCode };
                addToQueue(pendingProduct, updatedVariant);
            } else {
                const updatedProduct = { ...pendingProduct, barcode: newCode };
                addToQueue(updatedProduct);
            }

            setIsBarcodeAlertOpen(false);
            setPendingProduct(null);
        } else {
            toast.error(res.error || "Error al generar código");
        }
        setIsGenerating(false);
    };

    const updateQuantity = (uniqueId: string, delta: number) => {
        setPrintQueue(prev => {
            return prev.map(item => {
                const itemUniqueId = item.variant ? `${item.product.id}-${item.variant._id || item.variant.id || item.variant.tempId}` : item.product.id;
                if (itemUniqueId === uniqueId) {
                    const newQ = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQ };
                }
                return item;
            });
        });
    };

    const removeFromQueue = (uniqueId: string) => {
        setPrintQueue(prev => prev.filter(item => {
            const itemUniqueId = item.variant ? `${item.product.id}-${item.variant._id || item.variant.id || item.variant.tempId}` : item.product.id;
            return itemUniqueId !== uniqueId;
        }));
    };

    // Expand queue for the layout component (it expects an array of individual items to map)
    const expandedQueue = React.useMemo(() => {
        const expanded: any[] = [];
        printQueue.forEach(item => {
            for (let i = 0; i < item.quantity; i++) {
                expanded.push(item);
            }
        });
        return expanded;
    }, [printQueue]);

    const handlePrint = () => {
        if (expandedQueue.length === 0) return;
        window.print();
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div>;

    return (
        <div className="p-6 max-w-none mx-auto space-y-8 bg-slate-50/50 min-h-screen">

            {/* NO PRINT UI */}
            <div className="print:hidden space-y-8">

                {/* HEADER STANDARD */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl h-10 w-10 hover:bg-white border border-transparent hover:border-slate-200 shadow-sm transition-all text-slate-500">
                            <ArrowLeft size={20} />
                        </Button>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                Imprimir Etiquetas
                            </h1>
                            <p className="text-slate-500 text-sm font-medium">Genera etiquetas de códigos de barras para tus productos.</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* LEFT PANEL: SEARCH */}
                    <Card className="md:col-span-1 bg-white border-slate-200 shadow-sm rounded-[2rem] h-fit sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase text-slate-400">Buscar Producto</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                                <Input
                                    className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-50 font-bold uppercase transition-all focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                                    placeholder="Nombre, SKU o Código..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {isSearching && <Loader2 className="absolute right-3 top-3 animate-spin text-slate-400" size={16} />}
                            </div>

                            {searchResults.length > 0 && (
                                <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2">
                                    {searchResults.map(p => (
                                        <div key={p.id} className="space-y-1">
                                            {/* Base Product Option */}
                                            <button
                                                onClick={() => addToQueue(p)}
                                                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                                            >
                                                <p className="font-black text-xs uppercase text-slate-700 group-hover:text-slate-900 truncate">{p.name}</p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[10px] font-mono text-slate-400">{p.sku || 'S/SKU'}</span>
                                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">$ {p.price}</span>
                                                </div>
                                            </button>

                                            {/* Variants if any */}
                                            {p.variants && p.variants.length > 0 && (
                                                <div className="ml-4 pl-4 border-l-2 border-slate-100 space-y-1 py-1">
                                                    {p.variants.map((v: any, idx: number) => (
                                                        <button
                                                            key={v._id || idx}
                                                            onClick={() => addToQueue(p, v)}
                                                            className="w-full text-left p-2 rounded-lg hover:bg-blue-50/50 flex items-center justify-between group transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {v.color_hex && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color_hex }} />}
                                                                <span className="text-[10px] font-bold uppercase text-slate-500 group-hover:text-blue-600">{v.size} {v.color && `- ${v.color}`}</span>
                                                            </div>
                                                            <span className="text-[9px] font-mono text-slate-400">{v.barcode || 'S/COD'}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {searchTerm && searchResults.length === 0 && !isSearching && (
                                <p className="text-center text-xs text-slate-400 py-4 font-medium">No se encontraron productos.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* RIGHT PANEL: QUEUE */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden min-h-[500px] flex flex-col">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between pb-4">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Cola de Impresión</CardTitle>
                                    <p className="text-xs font-bold text-slate-400 uppercase">{expandedQueue.length} Etiquetas en total</p>
                                </div>
                                <Button onClick={handlePrint} disabled={expandedQueue.length === 0} className="bg-slate-900 hover:bg-black text-white px-6 h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 active:scale-95 transition-all">
                                    <Printer className="mr-2" size={18} /> Imprimir
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 bg-slate-50/30">
                                {printQueue.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 min-h-[300px]">
                                        <BarcodeIcon size={64} strokeWidth={1} />
                                        <p className="text-xs font-bold uppercase tracking-widest">La cola está vacía</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {printQueue.map((item) => {
                                            const uniqueId = item.variant ? `${item.product.id}-${item.variant._id || item.variant.id || item.variant.tempId}` : item.product.id;
                                            return (
                                                <div key={uniqueId} className="flex items-center p-4 bg-white hover:bg-slate-50/50 transition-colors gap-4">
                                                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 border border-slate-200 text-[10px]">
                                                        {item.product.sku?.substring(0, 3) || 'IMG'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-xs uppercase text-slate-800 truncate">{item.product.name}</p>
                                                            {item.variant && (
                                                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-200 text-blue-600 bg-blue-50/50">
                                                                    {item.variant.size} {item.variant.color && `/ ${item.variant.color}`}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-mono text-slate-400">
                                                            {item.variant?.barcode || item.product.barcode || item.product.sku || 'SIN CÓDIGO'}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl">
                                                        <Button variant="ghost" size="icon" onClick={() => updateQuantity(uniqueId, -1)} className="h-8 w-8 rounded-lg hover:bg-white shadow-sm"><Minus size={14} /></Button>
                                                        <span className="w-8 text-center font-black text-sm text-slate-700">{item.quantity}</span>
                                                        <Button variant="ghost" size="icon" onClick={() => updateQuantity(uniqueId, 1)} className="h-8 w-8 rounded-lg hover:bg-white shadow-sm"><Plus size={14} /></Button>
                                                    </div>

                                                    <Button variant="ghost" size="icon" onClick={() => removeFromQueue(uniqueId)} className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
                                                        <Trash2 size={18} />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* PRINT COMPONENT (Hidden from Screen, Visible on Print) */}
            <PrintLayout queue={expandedQueue} settings={org?.barcodeSettings} />

            {/* BARCODE GENERATION DIALOG */}
            <Dialog open={isBarcodeAlertOpen} onOpenChange={setIsBarcodeAlertOpen}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">Sin Código de Barras</DialogTitle>
                        <DialogDescription className="text-center text-slate-500 font-medium">
                            El producto <span className="text-slate-900 font-bold">{pendingProduct?.name}</span> no tiene un código asignado.
                            <br /><br />
                            ¿Deseas generar uno automáticamente ahora?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4 mt-4">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 animate-pulse"><BarcodeIcon size={32} /></div>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button variant="outline" onClick={() => setIsBarcodeAlertOpen(false)} className="rounded-xl h-12 font-bold uppercase text-[10px]">Cancelar</Button>
                            <Button onClick={handleGenerateConfirm} disabled={isGenerating} className="bg-slate-900 text-white rounded-xl h-12 font-black uppercase text-[10px]">
                                {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Printer className="mr-2" size={16} />} Generar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useTransition, useMemo, useEffect } from 'react'
import { Search, Package, Banknote, ArrowRight, FileText, Trash2, Edit2, AlertCircle, Tag, Plus, Globe, AlertTriangle, Store, Minus, WifiOff, Check, ChevronDown } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from 'sonner'
import { processSaleAction } from './actions'
import SaleSummary from '@/components/pos/SaleSummary'
import { CustomerSearch } from "@/components/pos/CustomerSearch"
import { PaymentComposer } from "@/components/pos/PaymentComposer"
import { DiscountControl } from "@/components/pos/DiscountControl"
import { CartItemEditor } from "@/components/pos/CartItemEditor"
import { FiscalSelector } from "@/components/pos/FiscalSelector"
import { VariantSelector } from "./components/VariantSelector"
import { TerminalSync } from "@/components/pos/TerminalSync"
import { cn } from "@/lib/utils"
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { posDB } from '@/lib/pos-db'

// Helper to generate a fake valid ObjectId (24 hex chars)
const generateObjectId = () => {
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

type Product = { id: string; _id?: string; name: string; price: number; current_stock: number; sku: string | null; variants?: any[]; pricing?: any[]; tax_rate?: number, createdAt?: string, updatedAt?: string }
type Customer = { id: string; name: string; tax_id: string | null; has_account: boolean; current_account_active: boolean; surcharge_rate?: number }
type CartItem = Product & {
    quantity: number,
    discount?: { type: 'PERCENT' | 'FIXED', value: number },
    exclude_from_general_discount?: boolean,
    variant_id?: string,
    variant_name?: string,
    priceListId?: string,
}

interface Props {
    initialProducts: Product[]
    initialCustomers: Customer[]
    initialPriceLists: any[]
    orgId: string
    currency: string
    slug: string
    activeSession: any | null
    org?: any
    ticketSettings?: any
    activeBranchId?: string | null
    terminalId?: string
}

export function PosInterface({ initialProducts, initialCustomers, initialPriceLists, orgId, currency, slug, activeSession, org, ticketSettings, activeBranchId, terminalId }: Props) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [cart, setCart] = useState<CartItem[]>([])

    // STATE: Search & Products (Moved to top to fix Initialization Error)
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [productsList, setProductsList] = useState<Product[]>(initialProducts)
    const [isSearching, setIsSearching] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 200)
        return () => clearTimeout(timer)
    }, [searchTerm])

    useEffect(() => {
        setProductsList(initialProducts);
        // Sembrar IndexedDB con datos iniciales
        if (initialProducts.length > 0) posDB.saveProducts(initialProducts);
        if (initialCustomers.length > 0) posDB.saveCustomers(initialCustomers);
    }, [initialProducts, initialCustomers]);

    const [isPending, startTransition] = useTransition()
    const [lastSale, setLastSale] = useState<any>(null)
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
    const [documentType, setDocumentType] = useState<string>('ticket')
    const [selectedPriceListId, setSelectedPriceListId] = useState<string>(() => {
        if (!initialPriceLists || initialPriceLists.length === 0) return '';
        const principal = initialPriceLists.find((l: any) => l.name === 'PRINCIPAL');
        return principal ? principal.id : initialPriceLists[0].id;
    })
    const [globalTaxRate, setGlobalTaxRate] = useState<number>(21.0)
    const [pricesExcludeVat, setPricesExcludeVat] = useState<boolean>(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])
    // ... (lines 60-410 omitted)

    useEffect(() => {
        if (!debouncedSearch.trim()) {
            setProductsList(initialProducts);
            return;
        }

        // OFFLINE SEARCH FALLBACK
        if (!navigator.onLine) {
            posDB.getProducts(debouncedSearch).then(localProducts => {
                setProductsList(localProducts);
            });
            return;
        }

        setIsSearching(true);
        import('./actions').then(({ searchProductsAction }) => {
            searchProductsAction(orgId, debouncedSearch, activeBranchId)
                .then(res => {
                    if (res.success) {
                        // Apply Price List Logic to fetched products
                        const processed = res.products.map((p: any) => {
                            let displayPrice = p.price;
                            if (selectedPriceListId && p.pricing) {
                                const priceEntry = p.pricing.find((entry: any) => entry.list_id === selectedPriceListId || entry.list_id?._id === selectedPriceListId);
                                if (priceEntry && priceEntry.price !== undefined && priceEntry.price !== 0) {
                                    displayPrice = priceEntry.price;
                                }
                            }
                            return { ...p, price: displayPrice }
                        });

                        // AUTO-SELECTION LOGIC: If search result is exactly a variant barcode, add to cart
                        const exactMatchProduct = processed.find((p: any) => {
                            // Check product main barcode
                            if (p.barcode === debouncedSearch) return true;
                            // Check variants barcodes
                            return p.variants?.some((v: any) => v.barcode === debouncedSearch);
                        });

                        if (exactMatchProduct && processed.length === 1) {
                            // Find which variant or if it is the main product
                            if (exactMatchProduct.barcode === debouncedSearch) {
                                addItemToCart(exactMatchProduct);
                                setSearchTerm('');
                                toast.success("Producto escaneado");
                            } else {
                                const matchedVariant = exactMatchProduct.variants.find((v: any) => v.barcode === debouncedSearch);
                                if (matchedVariant) {
                                    addItemToCart(exactMatchProduct, matchedVariant);
                                    setSearchTerm('');
                                    toast.success(`Variante escaneada: ${matchedVariant.size || ''} ${matchedVariant.color || ''}`);
                                }
                            }
                        }

                        setProductsList(processed);
                        // Update local DB with fresh results
                        posDB.saveProducts(processed);
                    }
                })
                .finally(() => setIsSearching(false));
        });
    }, [debouncedSearch, orgId, initialProducts, selectedPriceListId, activeBranchId]);


    // New Advanced States
    const [payments, setPayments] = useState<any[]>([])
    const [discountGeneral, setDiscountGeneral] = useState<{ type: 'PERCENT' | 'FIXED', value: number } | undefined>(undefined)
    const [roundingDifference, setRoundingDifference] = useState<number>(0)
    const [invoiceData, setInvoiceData] = useState<any>(null)

    // Variant Selection State
    const [isVariantSelectorOpen, setIsVariantSelectorOpen] = useState(false)
    const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null)

    // Quick Add Dialog State (for products WITHOUT variants)
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
    const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null)
    const [quickAddListId, setQuickAddListId] = useState<string>(selectedPriceListId)

    // Editor State
    const [editingItem, setEditingItem] = useState<CartItem | null>(null)

    // Varios / Misc Item State
    const [isVariosOpen, setIsVariosOpen] = useState(false)
    const [isClearAlertOpen, setIsClearAlertOpen] = useState(false)
    const [variosPrice, setVariosPrice] = useState('')
    const [variosDetail, setVariosDetail] = useState('')
    const [paymentResetKey, setPaymentResetKey] = useState(0)

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Error Modal
    const [errorModal, setErrorModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

    const selectedCustomer = useMemo(() => initialCustomers.find(c => c.id === selectedCustomerId), [selectedCustomerId, initialCustomers])

    // Derived Branch ID (Removed - passed as prop now);

    const handleAddVarios = () => {
        const price = parseFloat(variosPrice);
        if (isNaN(price) || price <= 0) {
            toast.error("Ingresa un precio válido");
            return;
        }

        const newItem: CartItem = {
            id: generateObjectId(),
            name: `(Varios) ${variosDetail.trim() || "Ítem General"}`,
            price: price,
            current_stock: 9999, // Virtual stock
            sku: null,
            quantity: 1,
            pricing: [],
            tax_rate: 21
        };

        setCart(current => [...current, newItem]);
        setIsVariosOpen(false);
        setVariosPrice('');
        setVariosDetail('');
        toast.success("Ítem agregado");
    }

    // Sync Cart Prices when global Price List changes
    // Only affects items that use the GLOBAL price list (no individual override)
    useMemo(() => {
        if (!selectedPriceListId) return;

        setCart(currentCart => {
            return currentCart.map(item => {
                // Skip items with their own specific price list
                if (item.priceListId && item.priceListId !== selectedPriceListId) return item;

                const originalProduct = initialProducts.find(p => p.id === item.id || p._id === item.id);
                if (!originalProduct) return item;

                let newPrice = originalProduct.price;
                if (originalProduct.pricing) {
                    const priceEntry = originalProduct.pricing.find((entry: any) => entry.list_id === selectedPriceListId || entry.list_id?._id === selectedPriceListId);
                    if (priceEntry && priceEntry.price !== undefined && priceEntry.price !== 0) {
                        newPrice = priceEntry.price;
                    }
                }

                if (item.price === newPrice) return item;

                return { ...item, price: newPrice, priceListId: selectedPriceListId };
            });
        });
    }, [selectedPriceListId, initialProducts]);



    // Customer Adjustment State
    const [applyCustomerAdjustment, setApplyCustomerAdjustment] = useState(true);

    // Effect: Reset or Set adjustment when customer changes
    useMemo(() => {
        if (selectedCustomer && selectedCustomer.surcharge_rate !== 0) {
            setApplyCustomerAdjustment(true);
        }
    }, [selectedCustomer]);

    // --- CALCULATIONS ---
    const { subtotal, adjustmentAmount, addedVatAmount, customerAdjustmentAmount, total } = useMemo(() => {
        let sub = 0
        let eligibleForGeneral = 0

        cart.forEach(item => {
            let itemPrice = item.price
            // Apply Item Adjustment (Positive = Surcharge, Negative = Discount)
            if (item.discount) {
                if (item.discount.type === 'PERCENT') {
                    itemPrice += itemPrice * (item.discount.value / 100)
                } else {
                    itemPrice += item.discount.value
                }
            }
            const lineTotal = itemPrice * item.quantity
            sub += lineTotal

            if (!item.exclude_from_general_discount) {
                eligibleForGeneral += lineTotal
            }
        })

        let adj = 0
        if (discountGeneral) {
            if (discountGeneral.type === 'PERCENT') {
                adj = eligibleForGeneral * (discountGeneral.value / 100)
            } else {
                adj = discountGeneral.value
            }
        }

        // Calculate Customer Adjustment (Surcharge or Discount)
        let custAdj = 0;
        if (selectedCustomer && selectedCustomer.surcharge_rate && applyCustomerAdjustment) {
            custAdj = sub * (selectedCustomer.surcharge_rate / 100);
        }

        // Total = Subtotal + Adjustment + CustomerAdjustment + Rounding
        // New VAT Logic: If pricesExcludeVat is true, we ADD VAT to the base (sub + adj + custAdj)
        let baseAmount = sub + adj + custAdj;
        let addedVatAmount = 0;
        if (pricesExcludeVat) {
            addedVatAmount = baseAmount * (globalTaxRate / 100);
        }

        let final = baseAmount + addedVatAmount + roundingDifference
        return { subtotal: sub, adjustmentAmount: adj, addedVatAmount, customerAdjustmentAmount: custAdj, total: Math.max(0, final) }
    }, [cart, discountGeneral, roundingDifference, pricesExcludeVat, globalTaxRate, selectedCustomer, applyCustomerAdjustment])

    // --- HANDLERS ---
    // Helper to update quantity
    // --- HANDLERS ---
    // --- HANDLERS ---
    const addToCart = (product: Product) => {
        // Validation: If product has variants, open variant selector (with price list)
        if (product.variants && product.variants.length > 0) {
            setSelectedProductForVariants(product);
            setIsVariantSelectorOpen(true);
            return;
        }

        // For products WITHOUT variants, open quick-add dialog with price list selector
        setQuickAddProduct(product);
        setQuickAddListId(selectedPriceListId);
        setIsQuickAddOpen(true);
    }

    const addItemToCart = (product: Product, variant?: any, itemPriceListId?: string) => {
        // Determine pricing from the selected list for this item
        const listId = itemPriceListId || selectedPriceListId;
        let itemPrice = product.price;
        if (listId && product.pricing) {
            const priceEntry = product.pricing.find((entry: any) => entry.list_id === listId || entry.list_id?._id === listId);
            if (priceEntry && priceEntry.price !== undefined && priceEntry.price !== 0) {
                itemPrice = priceEntry.price;
            }
        }

        setCart(current => {
            const variantId = variant ? (variant._id || variant.id) : undefined;

            const existing = current.find(i =>
                i.id === product.id &&
                i.variant_id === variantId &&
                i.priceListId === listId
            )

            // Stock Limit Check
            const stockLimit = variant ? variant.stock : product.current_stock;

            if (existing && existing.quantity >= stockLimit) {
                toast.error("Stock insuficiente (Límite alcanzado)");
                return current;
            }

            if (existing) {
                return current.map(i =>
                    (i.id === product.id && i.variant_id === variantId && i.priceListId === listId)
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                )
            }

            return [...current, {
                ...product,
                price: itemPrice,
                quantity: 1,
                variant_id: variantId,
                variant_name: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() : undefined,
                current_stock: stockLimit,
                priceListId: listId
            }]
        })
    }

    const handleVariantSelect = (variant: any, priceListId?: string) => {
        if (selectedProductForVariants) {
            addItemToCart(selectedProductForVariants, variant, priceListId);
            setIsVariantSelectorOpen(false);
            setSelectedProductForVariants(null);
            toast.success("Variante agregada");
        }
    }

    const handleQuickAdd = () => {
        if (quickAddProduct) {
            addItemToCart(quickAddProduct, undefined, quickAddListId);
            setIsQuickAddOpen(false);
            setQuickAddProduct(null);
            toast.success("Producto agregado");
        }
    }

    // Helper to update quantity
    const updateQuantity = (itemId: string, variantId: string | undefined, priceListId: string | undefined, delta: number) => {
        setCart(current => {
            return current.map(item => {
                if (item.id === itemId && item.variant_id === variantId && item.priceListId === priceListId) {
                    const newQty = item.quantity + delta;
                    const stockLimit = item.current_stock;
                    if (newQty > stockLimit) {
                        toast.error("Stock insuficiente (Límite alcanzado)");
                        return item;
                    }
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(item => item.quantity > 0);
        });
    };

    const handleRound = (type: 'UP' | 'DOWN' | 'NEAREST' | 'MANUAL', value?: number) => {
        const currentTotal = subtotal + adjustmentAmount
        let rounded = currentTotal

        if (type === 'MANUAL' && value !== undefined) {
            setRoundingDifference(value)
            return
        }

        if (type === 'UP') rounded = Math.ceil(currentTotal)
        else if (type === 'DOWN') rounded = Math.floor(currentTotal)
        else rounded = Math.round(currentTotal)

        setRoundingDifference(rounded - currentTotal)
    }

    const handleClearCart = () => {
        setIsClearAlertOpen(true)
    }

    const handleCheckout = () => {
        if (cart.length === 0) return

        const paid = payments.reduce((acc, p) => acc + p.amount, 0)

        if (paid < total - 0.05) {
            toast.error(`Falta cubrir $${(total - paid).toLocaleString('es-AR')}`)
            return
        }

        startTransition(async () => {
            try {
                const saleData = {
                    totalAmount: total,
                    cart: cart.map(i => {
                        let finalPrice = i.price;
                        if (pricesExcludeVat) {
                            finalPrice = finalPrice * (1 + globalTaxRate / 100);
                        }
                        return { 
                            ...i, 
                            price: finalPrice, 
                            tax_rate: globalTaxRate,
                            priceListId: i.priceListId || selectedPriceListId 
                        }
                    }),
                    customerId: selectedCustomerId,
                    paymentMethod: '', // Legacy
                    sessionId: activeSession.id,
                    documentType,
                    payments,
                    discountGeneral,
                    roundingDifference,
                    invoiceLetter: invoiceData?.letter,
                    fiscalData: invoiceData?.fiscalData,
                    surchargeGeneral: (selectedCustomer && selectedCustomer.surcharge_rate && applyCustomerAdjustment) ? {
                        type: 'PERCENT',
                        value: selectedCustomer.surcharge_rate,
                        applied_amount: customerAdjustmentAmount
                    } : null,
                    manualTaxAdded: pricesExcludeVat
                };

                // OFFLINE INTERCEPTION
                if (!navigator.onLine) {
                    await posDB.savePendingSale(saleData);
                    toast.success("Venta guardada localmente (Modo Offline)");
                    setCart([]); setSearchTerm(''); setSelectedCustomerId(null); setPayments([]); setDiscountGeneral(undefined); setRoundingDifference(0); setDocumentType('ticket'); setInvoiceData(null);
                    return;
                }

                const result = await processSaleAction(
                    orgId,
                    slug,
                    saleData.totalAmount,
                    saleData.cart,
                    saleData.customerId,
                    saleData.paymentMethod,
                    saleData.sessionId,
                    saleData.documentType,
                    saleData.payments,
                    saleData.discountGeneral,
                    saleData.roundingDifference,
                    saleData.invoiceLetter,
                    saleData.fiscalData,
                    saleData.surchargeGeneral,
                    saleData.manualTaxAdded
                )


                if (result.error) {
                    setErrorModal({ open: true, message: result.error });
                }
                else {
                    toast.success("Venta exitosa")
                    setLastSale(result.sale)
                    setCart([]); setSearchTerm(''); setSelectedCustomerId(null); setPayments([]); setDiscountGeneral(undefined); setRoundingDifference(0); setDocumentType('ticket'); setInvoiceData(null);
                }
            } catch (error) {
                toast.error("Error inesperado.")
            }
        })
    }

    if (!activeSession || activeSession.status !== 'open') {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white p-6 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300 border-2 border-dashed border-slate-200">
                    <Banknote size={48} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Punto de Venta Inactivo</h2>
                <p className="text-slate-500 max-w-sm mb-10">Debés iniciar un turno de caja para poder procesar ventas.</p>

                <Button
                    onClick={() => router.push(`/${slug}/cash`)}
                    className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-8 h-12 tracking-widest rounded-xl shadow-lg shadow-slate-900/10 flex items-center gap-2"
                >
                    Ir a Gestión de Caja <ArrowRight size={16} />
                </Button>
            </div>
        )
    }

    // (Removed duplicate search logic)

    // Recalculate prices if price list changes (local optimization for current view)
    const displayedProducts = useMemo(() => {
        return productsList.map(p => {
            let displayPrice = p.price;
            if (selectedPriceListId && p.pricing) {
                const priceEntry = p.pricing.find((entry: any) => entry.list_id === selectedPriceListId || entry.list_id?._id === selectedPriceListId);
                if (priceEntry && priceEntry.price !== undefined && priceEntry.price !== 0) {
                    displayPrice = priceEntry.price;
                }
            }
            return { ...p, price: displayPrice }
        })
    }, [productsList, selectedPriceListId])

    return (
        <div className="flex flex-col h-full p-6 max-w-none mx-auto space-y-6 overflow-y-auto">
            {isMounted && terminalId && <TerminalSync registerId={terminalId} />}

            {isMounted && !navigator.onLine && (
                <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl flex items-center gap-2 mb-2 animate-pulse">
                    <WifiOff size={14} className="text-amber-500" />
                    <span className="text-[10px] font-black text-amber-600 uppercase">Modo de Consulta Offline - Datos locales activados</span>
                </div>
            )}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6 shrink-0">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Punto de Venta
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Gestiona ventas, facturación y control de caja.</p>
                </div>
            </header>

            <div className="flex-1 flex gap-4 items-start pb-10">
                {/* ... Left Panel (Products) - STICKY ... */}
                <div className="flex-1 flex flex-col gap-4 min-h-0 sticky top-0 h-[calc(100vh-8rem)]">
                    <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                        {/* Search Group */}
                        <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 flex-1 max-w-xl">
                            <div className="px-3 h-9 bg-slate-200 rounded-lg flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase border border-slate-300">
                                <Search size={14} /> BUSCAR
                            </div>
                            <Input
                                placeholder="Nombre o SKU..."
                                className="bg-transparent border-0 focus-visible:ring-0 text-slate-900 text-sm h-9 shadow-none flex-1"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Price List Selector */}
                        {initialPriceLists.length > 0 && (
                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Tag size={10} /> Precio:</div>
                                <Select value={selectedPriceListId || ''} onValueChange={setSelectedPriceListId}>
                                    <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[120px] shadow-sm focus:ring-2 focus:ring-primary/20">
                                        <SelectValue placeholder="Lista" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialPriceLists.map(list => (
                                            <SelectItem key={list.id} value={list.id} className="text-[10px] uppercase font-bold text-slate-700">{list.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Session Info & Actions */}
                        <div className="flex gap-2 ml-auto items-center">
                            <div className="flex items-center gap-1 mr-2 hidden xl:flex">
                                <Badge variant="outline" className="h-9 px-3 bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold uppercase tracking-wider gap-1.5">
                                    <Banknote size={12} />
                                    <span className="opacity-50">CAJA:</span>
                                    {activeSession.cash_registers?.name || '---'}
                                </Badge>
                                <Badge variant="outline" className="h-9 px-3 bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold uppercase tracking-wider gap-1.5">
                                    <Store size={12} />
                                    <span className="opacity-50">SUC:</span>
                                    {activeSession.branchName || '---'}
                                </Badge>
                            </div>

                            <Button
                                onClick={() => setIsVariosOpen(true)}
                                className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl shadow-lg shadow-slate-900/20"
                            >
                                <Plus size={16} className="mr-2" /> Varios
                            </Button>
                        </div>
                    </div>
                    <ScrollArea className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-200 p-0 shadow-inner overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50/80 sticky top-0 z-10 shadow-sm backdrop-blur-sm h-10 text-[10px] uppercase font-black border-slate-200 text-slate-600">
                                <TableRow>
                                    <TableHead className="w-[200px]">Producto</TableHead>
                                    <TableHead>Proveedor</TableHead>
                                    <TableHead>Rubro</TableHead>
                                    <TableHead className="w-[80px]">Código</TableHead>
                                    <TableHead className="text-center w-[50px]">Web</TableHead>
                                    <TableHead className="text-right">Precio</TableHead>
                                    <TableHead className="text-center w-[80px]">Stock</TableHead>
                                    <TableHead className="text-center w-[100px]">Modificado</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isSearching && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2 text-slate-500 font-bold text-xs uppercase animate-pulse">
                                                <Store className="animate-bounce" size={16} /> Buscando en servidor...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isSearching && displayedProducts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-slate-400 text-xs uppercase font-bold">
                                            Sin resultados
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isSearching && displayedProducts.map((product) => (
                                    <TableRow
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="cursor-pointer hover:bg-indigo-50/50 transition-colors group"
                                    >
                                        <TableCell className="font-medium text-slate-700 py-2">
                                            <span className="leading-tight line-clamp-2">{product.name}</span>
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500 py-2">
                                            {(product as any).supplier_id?.name || '---'}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500 py-2">
                                            <div className="flex flex-wrap gap-1">
                                                {(product as any).category_ids?.map((c: any) => (
                                                    <Badge key={c._id || c} variant="outline" className="text-[9px] h-4 px-1 bg-slate-50 text-slate-500 border-slate-200">
                                                        {c.name}
                                                    </Badge>
                                                )) || '---'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-500 py-2">
                                            {product.sku || '---'}
                                        </TableCell>
                                        <TableCell className="text-center py-2">
                                            {(product as any).is_visible ?
                                                <Globe size={14} className="text-indigo-400 mx-auto" /> :
                                                <span className="text-slate-200 mx-auto block">-</span>
                                            }
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-indigo-600 py-2">
                                            {currency}{product.price.toLocaleString('es-AR')}
                                        </TableCell>
                                        <TableCell className="text-center py-2">
                                            <Badge variant={product.current_stock > 0 ? "secondary" : "destructive"} className="text-[10px] h-5 px-1.5 min-w-[30px] justify-center">
                                                {product.current_stock}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center py-2 text-[10px] text-slate-400 font-medium">
                                            {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('es-AR') : '---'}
                                        </TableCell>
                                        <TableCell className="py-2 text-right">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus size={16} strokeWidth={3} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!isSearching && displayedProducts.length === 50 && (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={9} className="text-center py-4 text-xs font-bold text-slate-400 uppercase">
                                            Se muestran 50 resultados (Búsqueda Servidor)
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>

                {/* ... Right Panel (Cart & Payment) ... */}
                <div className="w-[420px] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Resumen del Ticket</h3>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 relative">
                        <div className="flex-1 relative overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="p-4 space-y-1">
                                    {cart.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                                            <FileText size={48} strokeWidth={1} />
                                            <p className="text-sm mt-2">Ticket vacío</p>
                                        </div>
                                    )}
                                    {cart.map((item) => (
                                        <div key={`${item.id}-${item.variant_id || 'base'}-${item.priceListId || 'default'}`} className={cn("group flex gap-2 py-3 border-b border-dashed border-slate-100 last:border-0", (item.discount || item.exclude_from_general_discount) && "bg-slate-50/50 -mx-2 px-2 rounded-lg")}>
                                            <div className="flex-1 cursor-pointer" onClick={() => setEditingItem(item)}>
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-1">
                                                            {item.name}
                                                        </p>
                                                        {item.variant_name && (
                                                            <Badge variant="outline" className="mt-0.5 text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 border-indigo-100 px-1.5 h-4">
                                                                {item.variant_name}
                                                            </Badge>
                                                        )}
                                                        {item.sku && <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.sku}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="flex items-center bg-slate-100 rounded-full p-0.5 shadow-inner" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 rounded-full hover:bg-white hover:text-red-600 hover:shadow-sm transition-all"
                                                            onClick={() => updateQuantity(item.id, item.variant_id, item.priceListId, -1)}
                                                        >
                                                            {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} strokeWidth={3} />}
                                                        </Button>
                                                        <span className="text-xs font-black text-slate-700 w-8 text-center tabular-nums">{item.quantity}</span>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 rounded-full hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all"
                                                            onClick={() => updateQuantity(item.id, item.variant_id, item.priceListId, 1)}
                                                        >
                                                            <Plus size={12} strokeWidth={3} />
                                                        </Button>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-medium">x {currency}{item.price.toLocaleString('es-AR')}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end justify-between">
                                                <span className="font-bold text-slate-700 block">
                                                    {currency}
                                                    {((item.discount ? (item.discount.type === 'PERCENT' ? item.price * (1 + item.discount.value / 100) : item.price + item.discount.value) : item.price) * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                </span>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-1">
                                                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingItem(item); }} className="h-7 w-7 text-slate-300 hover:text-blue-500 rounded-full hover:bg-blue-50"><Edit2 size={14} /></Button>
                                                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setCart(c => c.filter(i => !(i.id === item.id && i.variant_id === item.variant_id && i.priceListId === item.priceListId))); }} className="h-7 w-7 text-slate-300 hover:text-red-500 rounded-full hover:bg-red-50"><Trash2 size={14} /></Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Sidebar Footer (Calculated Total & Clear) */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-4 shrink-0">
                            <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Estimado</span>
                                <span className="text-2xl font-black text-slate-900 tracking-tight">{currency}{total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                            </div>

                            <Button
                                size="lg"
                                className="w-full text-base h-16 rounded-2xl shadow-xl bg-slate-950 hover:bg-black active:scale-[0.98] font-black uppercase tracking-widest flex items-center justify-center gap-3 group transition-all text-white"
                                disabled={cart.length === 0}
                                onClick={() => setIsPaymentModalOpen(true)}
                            >
                                Continuar al Pago
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full text-slate-400 hover:text-red-600 hover:bg-red-50 h-10 text-[10px] font-black uppercase tracking-widest"
                                onClick={handleClearCart}
                                disabled={cart.length === 0}
                            >
                                <Trash2 size={14} className="mr-2" /> Vaciar Ticket
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Vaciar Ticket Completo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará todos los ítems, pagos, descuentos y redondeos del ticket actual. No se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setCart([])
                            setPayments([])
                            setDiscountGeneral(undefined)
                            setRoundingDifference(0)
                            setSelectedCustomerId(null)
                            setDocumentType('ticket')
                            setPaymentResetKey(prev => prev + 1)
                        }} className="bg-red-600 hover:bg-red-700">Vaciar Todo</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <VariantSelector
                open={isVariantSelectorOpen}
                onOpenChange={setIsVariantSelectorOpen}
                product={selectedProductForVariants}
                onSelectVariant={handleVariantSelect}
                branchId={activeBranchId}
                priceLists={initialPriceLists}
                defaultPriceListId={selectedPriceListId}
            />

            {/* Quick Add Dialog (Products WITHOUT variants) */}
            <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
                <DialogContent className="max-w-[420px] bg-white rounded-[1.5rem] p-0 border-none shadow-2xl overflow-hidden">
                    <div className="flex justify-between items-center bg-slate-50 p-6 border-b border-slate-100">
                        <div>
                            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Package size={20} className="text-slate-500" />
                                {quickAddProduct?.name}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-slate-500 mt-1">
                                Confirmar producto y lista de precio.
                            </DialogDescription>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        {/* Price List Selector */}
                        {initialPriceLists.length > 0 && (
                            <div className="flex items-center gap-3 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                                <Tag size={14} className="text-indigo-500 shrink-0" />
                                <span className="text-[10px] font-black text-indigo-400 uppercase shrink-0">Lista:</span>
                                <Select value={quickAddListId} onValueChange={setQuickAddListId}>
                                    <SelectTrigger className="bg-white border-indigo-200 rounded-lg h-9 text-[11px] font-black uppercase px-4 flex-1 shadow-sm focus:ring-2 focus:ring-indigo-300">
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialPriceLists.map(list => (
                                            <SelectItem key={list.id || list._id} value={list.id || list._id} className="text-[10px] uppercase font-bold text-slate-700">
                                                {list.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Price Preview */}
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Precio</span>
                            <span className="text-xl font-black text-indigo-600">
                                {currency}{(() => {
                                    if (!quickAddProduct) return '0';
                                    let p = quickAddProduct.price;
                                    if (quickAddListId && quickAddProduct.pricing) {
                                        const entry = quickAddProduct.pricing.find((e: any) => e.list_id === quickAddListId || e.list_id?._id === quickAddListId);
                                        if (entry && entry.price !== undefined && entry.price !== 0) p = entry.price;
                                    }
                                    return p.toLocaleString('es-AR');
                                })()}
                            </span>
                        </div>

                        {/* Stock info */}
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Stock Disponible</span>
                            <Badge variant={quickAddProduct?.current_stock && quickAddProduct.current_stock > 0 ? 'secondary' : 'destructive'} className="text-[10px] font-bold">
                                {quickAddProduct?.current_stock || 0} Un.
                            </Badge>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIsQuickAddOpen(false)} className="rounded-xl font-bold text-xs h-10 px-6 border-slate-200 hover:bg-white">
                            Cancelar
                        </Button>
                        <Button onClick={handleQuickAdd} className="rounded-xl font-bold text-xs h-10 px-6 bg-slate-900 hover:bg-black text-white shadow-sm">
                            <Plus size={14} className="mr-1" /> Agregar al Ticket
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {editingItem && (
                <CartItemEditor
                    item={editingItem}
                    isOpen={!!editingItem}
                    onClose={() => setEditingItem(null)}
                    onSave={(updates: any) => {
                        setCart(current => current.map(i => (i.id === editingItem.id && i.variant_id === editingItem.variant_id && i.priceListId === editingItem.priceListId) ? { ...i, ...updates } : i))
                    }}
                    onDelete={() => {
                        setCart(current => current.filter(i => !(i.id === editingItem.id && i.variant_id === editingItem.variant_id && i.priceListId === editingItem.priceListId)))
                        setEditingItem(null)
                    }}
                />
            )}

            {/* Varios Dialog */}
            <Dialog open={isVariosOpen} onOpenChange={setIsVariosOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Agregar Ítem Varios</DialogTitle>
                        <DialogDescription>
                            Ingresa un monto y un detalle opcional para agregar un ítem libre.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="v-price">Precio</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                <Input id="v-price" type="number" value={variosPrice} onChange={(e) => setVariosPrice(e.target.value)} className="pl-7" placeholder="0.00" autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddVarios()
                                    }} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="v-detail">Detalle / Concepto</Label>
                            <Input id="v-detail" value={variosDetail} onChange={(e) => setVariosDetail(e.target.value)} placeholder="Ej: Flete, Servicio, etc."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddVarios()
                                }} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleAddVarios}>Agregar al Ticket</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {lastSale && <SaleSummary sale={lastSale} orgId={orgId} onClose={() => setLastSale(null)} org={org} ticketSettings={ticketSettings} />}

            {/* PAYMENT MODAL */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-[900px] max-h-[95vh] bg-white rounded-3xl p-0 border-none shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
                    <DialogHeader className="p-4 md:p-8 border-b border-slate-100 shrink-0">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <DialogTitle className="text-lg md:text-xl font-black uppercase text-slate-800 tracking-tight">Caja / Registrar Pago</DialogTitle>
                                <DialogDescription className="hidden">Completa los datos de pago y facturación</DialogDescription>
                            </div>
                            <div className="text-left md:text-right w-full md:w-auto bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total a Cobrar</p>
                                <p className="text-2xl md:text-3xl font-black text-slate-900 leading-none">{currency}{total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100 flex-1 overflow-y-auto">
                        {/* Columna Izquierda: Información de Venta y Ajustes */}
                        <div className="col-span-12 md:col-span-5 p-4 md:p-8 space-y-6 overflow-y-auto bg-slate-50/30">
                            {/* 1. Cliente y Tipo de Venta (Arriba a la Izquierda) */}
                            <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <CustomerSearch customers={initialCustomers} selectedId={selectedCustomerId} onSelect={setSelectedCustomerId} />
                                <FiscalSelector
                                    customer={selectedCustomer}
                                    totalAmount={total}
                                    onInvoiceChange={(data) => {
                                        setDocumentType(data.type);
                                        setInvoiceData(data);
                                    }}
                                />
                            </div>

                            {/* 2. Ajustes, Redondeo y Configuración Fiscal (Bloque Unificado) */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                                <DiscountControl
                                    currentAdjustment={discountGeneral}
                                    currentRounding={roundingDifference}
                                    onApplyAdjustment={(type, val) => setDiscountGeneral(val === 0 ? undefined : { type, value: val })}
                                    onRound={(type, val) => setRoundingDifference(val || 0)}
                                />

                                <div className="space-y-4 pt-4 border-t border-slate-50">
                                    <div className="relative group/select">
                                        <select
                                            value={globalTaxRate}
                                            onChange={(e) => setGlobalTaxRate(parseFloat(e.target.value))}
                                            className="w-full h-12 rounded-xl bg-slate-50 text-sm font-black border border-slate-200 px-4 focus:ring-2 focus:ring-slate-950 transition-all uppercase appearance-none cursor-pointer hover:bg-slate-100"
                                        >
                                            <option value="21">IVA 21%</option>
                                            <option value="10.5">IVA 10.5%</option>
                                            <option value="27">IVA 27%</option>
                                            <option value="0">EXENTO</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/select:text-slate-600 transition-colors">
                                            <ChevronDown size={16} strokeWidth={3} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 group cursor-pointer hover:bg-slate-100 transition-all" onClick={() => setPricesExcludeVat(!pricesExcludeVat)}>
                                        <Checkbox
                                            id="tax-mode-modal"
                                            checked={pricesExcludeVat}
                                            onCheckedChange={(c) => setPricesExcludeVat(!!c)}
                                            className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900 pointer-events-none"
                                        />
                                        <div className="space-y-0.5 pointer-events-none">
                                            <Label htmlFor="tax-mode-modal" className="text-[10px] font-black uppercase text-slate-700 cursor-pointer select-none">Precios Netos / Sin IVA</Label>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">Adicionar IVA automáticamente</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Desglose de Totales (Resumen final para feedback) */}
                            <div className="space-y-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <span>Subtotal</span>
                                    <span className="text-slate-900">{currency}{subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                </div>

                                {adjustmentAmount !== 0 && (
                                    <div className={cn("flex justify-between text-xs font-black uppercase tracking-wider", adjustmentAmount > 0 ? "text-red-500" : "text-emerald-500")}>
                                        <span>{adjustmentAmount > 0 ? "Recargo" : "Descuento"}</span>
                                        <span>{adjustmentAmount > 0 ? '+' : ''}{currency}{adjustmentAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}

                                {customerAdjustmentAmount !== 0 && applyCustomerAdjustment && (
                                    <div className={cn("flex justify-between text-xs font-black uppercase tracking-wider", customerAdjustmentAmount > 0 ? "text-red-500" : "text-emerald-500")}>
                                        <span>Ajuste Cliente ({Math.abs(selectedCustomer?.surcharge_rate || 0)}%)</span>
                                        <span>{customerAdjustmentAmount > 0 ? '+' : ''}{currency}{customerAdjustmentAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}

                                {pricesExcludeVat && (
                                    <div className="flex justify-between text-xs font-black text-indigo-600 uppercase tracking-wider">
                                        <span>IVA ({globalTaxRate}%)</span>
                                        <span>+{currency}{addedVatAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}

                                {roundingDifference !== 0 && (
                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold italic uppercase">
                                        <span>Diferencia Redondeo</span>
                                        <span>{roundingDifference > 0 ? '+' : ''}{currency}{roundingDifference.toFixed(2)}</span>
                                    </div>
                                )}

                                <div className="pt-3 border-t border-slate-200 mt-1 flex justify-between items-center">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-900">Total Final</span>
                                    <span className="text-xl font-black text-slate-900 tracking-tight">{currency}{total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Gestión de Pagos */}
                        <div className="col-span-12 md:col-span-7 p-4 md:p-8 flex flex-col justify-between bg-white overflow-y-auto">
                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#0f172a]/40">Gestión de Cobro</h4>
                                </div>
                                <PaymentComposer key={paymentResetKey} totalAmount={total} customer={selectedCustomer} onPaymentsChange={setPayments} />
                            </div>

                            <div className="space-y-4 pt-6 md:pt-10">
                                <Button
                                    size="lg"
                                    className="w-full h-14 md:h-16 rounded-2xl bg-slate-950 hover:bg-black font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-xs md:text-sm shadow-xl shadow-slate-200 transition-all group text-white"
                                    disabled={isPending || (payments.reduce((a, b) => a + b.amount, 0) < total - 0.05)}
                                    onClick={() => {
                                        handleCheckout();
                                        setIsPaymentModalOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        {isPending ? 'Procesando...' : 'Guardar y Finalizar Venta'}
                                        <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </div>
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full h-10 md:h-12 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] transition-all"
                                    onClick={() => setIsPaymentModalOpen(false)}
                                >
                                    Seguir Editando Carrito
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ERROR MODAL */}
            <Dialog open={errorModal.open} onOpenChange={(open) => !open && setErrorModal(prev => ({ ...prev, open: false }))}>
                <DialogContent className="w-[95vw] sm:max-w-[440px] bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border-none shadow-2xl z-[150] overflow-hidden transition-all">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-center text-red-600 mb-2">
                            Error en la Venta
                        </DialogTitle>
                        <DialogDescription className="hidden">Error Detallado</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-8">
                        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 animate-in zoom-in duration-500 shadow-inner">
                            <AlertTriangle size={48} />
                        </div>
                        
                        <div className="w-full bg-slate-50/80 rounded-2xl p-6 border border-slate-100">
                            <ScrollArea className="max-h-[220px] w-full pr-4">
                                <p className="text-base text-slate-800 font-bold leading-relaxed whitespace-pre-wrap break-words">
                                    {typeof errorModal.message === 'string' 
                                        ? errorModal.message 
                                        : JSON.stringify(errorModal.message, null, 2)}
                                </p>
                            </ScrollArea>
                        </div>

                        <Button
                            onClick={() => setErrorModal({ open: false, message: '' })}
                            className="w-full bg-slate-900 text-white h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-black transition-all shadow-xl shadow-slate-200 group"
                        >
                            <span className="group-hover:scale-105 transition-transform">Entendido y Volver</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

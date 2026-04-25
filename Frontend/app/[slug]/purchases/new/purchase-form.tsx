'use client';

import React, { useState, useTransition, useEffect, useCallback } from 'react'
import { Search, Trash2, Save, Truck, Plus, Loader2, AlertCircle, ShoppingCart, Filter, ChevronLeft, ChevronRight, Package, Check, Store } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from 'sonner'
import { registerPurchaseAction } from './actions'
import { useRouter } from 'next/navigation'
import { productService } from '@/services/productService'

// --- TIPOS DE DATOS ---
type Product = {
    id: string
    name: string
    current_stock: number
    sku: string | null
    cost?: number // Agregamos costo
    branches?: { id: string, name: string, stock: number }[]
    manages_lots?: boolean
    variants?: {
        _id: string
        color: string
        size: string
        stock: number
    }[]
}

type Supplier = {
    id: string
    name: string
}

type Branch = {
    id: string
    name: string
}

type PurchaseItem = Product & {
    quantity: number
    cost: number
    variant_id?: string
    variant_name?: string
    lot_number?: string
    expiration_date?: string
}

interface Props {
    products: Product[]
    suppliers: Supplier[]
    branches: Branch[]
    orgId: string
    slug: string
}

export function PurchaseForm({ products: initialProducts, suppliers, branches, orgId, slug }: Props) {
    const router = useRouter()

    // UI & Data States
    const [searchTerm, setSearchTerm] = useState('')
    const [products, setProducts] = useState(initialProducts)
    const [cart, setCart] = useState<PurchaseItem[]>([])
    const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [isLoadingProducts, setIsLoadingProducts] = useState(false)
    const [totalProducts, setTotalProducts] = useState(0)

    // Pagination & Filters
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [stockFilter, setStockFilter] = useState<'ALL' | 'OUT' | 'LOW'>('ALL')
    const [catalogBranchFilter, setCatalogBranchFilter] = useState<string | null>(null)
    const [updateTimestamp, setUpdateTimestamp] = useState(false)

    // Estado para el modal de variantes
    const [isVariantModalOpen, setIsVariantModalOpen] = useState(false)
    const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null)
    const [variantSelections, setVariantSelections] = useState<Record<string, boolean>>({})
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

    // Fetch products with pagination/search/filters
    const fetchProducts = useCallback(async (page: number, search: string, filter: string, supplierId: string | null, branchId: string | null) => {
        setIsLoadingProducts(true)
        try {
            // El backend y el servicio esperan parámetros específicos. 
            // Normalizamos para que coincidan con lo que productService.getAll y el Backend entienden.
            const params: any = {
                page,
                limit: 20,
                search,
                sortBy: 'sku',
                sortOrder: 'asc',
                stock: filter, // 'ALL', 'OUT', 'LOW'
                branch: branchId || 'ALL',
                supplierId: supplierId || undefined // El servicio mapea supplierId -> supplier_id
            }

            const res = await productService.getAll(orgId, params)
            setProducts(res.data || [])
            setTotalPages(res.pagination?.totalPages || 1)
            setTotalProducts(res.pagination?.total || 0)
        } catch (error) {
            console.error("Error al cargar productos:", error)
        } finally {
            setIsLoadingProducts(false)
        }
    }, [orgId])

    // Trigger fetch on filter/search/page/supplier/branch change
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts(currentPage, searchTerm, stockFilter, selectedSupplier, catalogBranchFilter)
        }, 500)
        return () => clearTimeout(timer)
    }, [currentPage, searchTerm, stockFilter, selectedSupplier, catalogBranchFilter, fetchProducts])

    // Reset page on search/filter/supplier/branch change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, stockFilter, selectedSupplier, catalogBranchFilter])

    // 2. Agregar al carrito
    const addToCart = (product: Product) => {
        // Si el producto tiene variantes, abrimos el modal de selección
        if (product.variants && product.variants.length > 0) {
            setSelectedProductForVariants(product)
            // Por defecto DESACTIVADAS por pedido del usuario
            const initialSelections: Record<string, boolean> = {}
            product.variants.forEach((v, idx) => {
                initialSelections[`${v._id}-${idx}`] = false
            })
            setVariantSelections(initialSelections)
            setIsVariantModalOpen(true)
            return
        }

        setCart(prev => {
            // Producto simple (sin variantes)
            const existing = prev.find(item => item.id === product.id && !item.variant_id)
            if (existing) {
                toast.info("Aumentando cantidad de " + product.name)
                return prev.map(item => (item.id === product.id && !item.variant_id) ? { ...item, quantity: item.quantity + 1 } : item)
            }
            const item: PurchaseItem = {
                ...product,
                quantity: 1,
                cost: product.cost || 0,
                lot_number: '',
                expiration_date: ''
            }
            return [...prev, item]
        })
    }

    const addVariantsToCart = () => {
        if (!selectedProductForVariants) return

        const newCart: PurchaseItem[] = []
        selectedProductForVariants.variants?.forEach((v, idx) => {
            if (variantSelections[`${v._id}-${idx}`]) {
                const item: PurchaseItem = {
                    ...selectedProductForVariants,
                    quantity: 1,
                    cost: selectedProductForVariants.cost || 0,
                    variant_id: v._id,
                    variant_name: `${v.color} / ${v.size}`,
                    lot_number: '',
                    expiration_date: ''
                }
                newCart.push(item)
            }
        })

        setCart(prev => {
            const updatedPrev = prev.filter(item =>
                !(selectedProductForVariants.id === item.id && newCart.some(newItem => newItem.variant_id === item.variant_id && newItem.variant_name === item.variant_name))
            )
            const itemsToAdd = newCart.filter(newItem =>
                !prev.some(item => item.id === newItem.id && item.variant_id === newItem.variant_id && item.variant_name === newItem.variant_name)
            )

            if (itemsToAdd.length === 0 && newCart.length > 0) {
                toast.info("Las variantes seleccionadas ya están en el resumen.")
                return prev
            }

            toast.success(`Agregadas ${itemsToAdd.length} variantes`)
            return [...updatedPrev, ...itemsToAdd]
        })

        setIsVariantModalOpen(false)
        setSelectedProductForVariants(null)
    }

    // 3. Eliminar item de la lista
    const removeFromCart = (id: string, variantId?: string, variantName?: string) => {
        setCart(prev => prev.filter(item => !(item.id === id && item.variant_id === variantId && item.variant_name === variantName)))
    }

    // 4. Actualizar cantidad o costo unitario
    const updateItem = (id: string, field: 'quantity' | 'cost' | 'lot_number' | 'expiration_date', value: any, variantId?: string, variantName?: string) => {
        setCart(prev => prev.map(item =>
            (item.id === id && item.variant_id === variantId && item.variant_name === variantName) ? { ...item, [field]: value } : item
        ))
    }

    const totalAmount = cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0)

    // 5. Guardar Compra
    const handleSave = () => {
        if (cart.length === 0) return

        if (!selectedBranch) {
            toast.warning("Debes seleccionar una sucursal de destino para el stock.")
            return
        }

        if (cart.some(item => item.cost <= 0)) {
            toast.warning("Algunos productos tienen costo $0. Revísalos antes de confirmar.")
            return
        }

        startTransition(async () => {
            // Solo mandamos items con cantidad > 0
            const cleanItems = cart
                .filter(item => item.quantity > 0)
                .map(item => ({
                    product_id: item.id,
                    variant_id: item.variant_id || null,
                    quantity: item.quantity,
                    cost: item.cost,
                    lot_number: item.lot_number,
                    expiration_date: item.expiration_date
                }))

            if (cleanItems.length === 0) {
                toast.warning("No hay productos con cantidad mayor a 0 para registrar.")
                return
            }

            const result = await registerPurchaseAction(orgId, slug, selectedSupplier, selectedBranch, totalAmount, cleanItems, updateTimestamp)

            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Entrada de stock registrada correctamente")
                router.push(`/${slug}/purchases`)
            }
        })
    }

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">

                {/* === COLUMNA IZQUIERDA: CATÁLOGO === */}
                <div className="flex flex-col gap-4">
                    <Card className="flex flex-col p-5 border-none shadow-xl bg-white rounded-[2rem] overflow-hidden flex-1">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black uppercase tracking-tighter flex items-center gap-2 text-slate-900 text-lg">
                                <Package size={22} className="text-blue-600" /> Catálogo de Artículos
                            </h3>
                            <Badge variant="outline" className="border-slate-200 text-slate-400 text-[9px] font-bold uppercase tracking-widest px-2">
                                {totalProducts} Items
                            </Badge>
                        </div>

                        {/* BUSCADOR Y FILTROS ESTILO PÍLDORA */}
                        {/* ... (sin cambios aquí) ... */}
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center bg-slate-50/50 rounded-2xl border border-slate-100 p-1.5 shadow-sm">
                                <div className="px-4 h-10 bg-white rounded-xl flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase border border-slate-100 shadow-sm">
                                    <Search size={14} className="text-blue-500" /> BUSCAR
                                </div>
                                <input
                                    type="text"
                                    placeholder="Nombre del producto o código SKU..."
                                    className="bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-900 text-sm h-10 shadow-none flex-1 font-bold pl-4 w-full"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-1.5 bg-slate-50/80 p-0.5 rounded-full border border-slate-100 shadow-sm transition-all hover:bg-slate-100/50">
                                    <div className="pl-3 pr-0 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 grayscale opacity-70">
                                        <Store size={11} /> SUCURSAL:
                                    </div>
                                    <Select onValueChange={(val: string) => setCatalogBranchFilter(val === 'none' ? null : val)} value={catalogBranchFilter || 'none'}>
                                        <SelectTrigger className="bg-white border-none rounded-full h-7 text-[9px] font-black uppercase px-3 min-w-[110px] shadow-sm focus:ring-2 focus:ring-blue-100 transition-all border-slate-100">
                                            <SelectValue placeholder="TODAS" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                                            <SelectItem value="none" className="text-[9px] font-bold uppercase rounded-xl transition-all data-[state=checked]:bg-blue-600 data-[state=checked]:text-white">
                                                TODAS LAS SUCURSALES
                                            </SelectItem>
                                            {branches.map(b => (
                                                <SelectItem key={b.id} value={b.id} className="text-[9px] font-bold uppercase rounded-xl transition-all data-[state=checked]:bg-blue-600 data-[state=checked]:text-white">
                                                    {b.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-1.5 bg-slate-50/80 p-0.5 rounded-full border border-slate-100 shadow-sm transition-all hover:bg-slate-100/50">
                                    <div className="pl-3 pr-0 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 grayscale opacity-70">
                                        <Truck size={11} /> PROVEEDOR:
                                    </div>
                                    <Select onValueChange={(val: string) => setSelectedSupplier(val === 'none' ? null : val)} value={selectedSupplier || 'none'}>
                                        <SelectTrigger className="bg-white border-none rounded-full h-7 text-[9px] font-black uppercase px-3 min-w-[120px] shadow-sm focus:ring-2 focus:ring-blue-100 transition-all border-slate-100">
                                            <SelectValue placeholder="TODOS" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                                            <SelectItem value="none" className="text-[9px] font-bold uppercase rounded-xl transition-all data-[state=checked]:bg-blue-600 data-[state=checked]:text-white">
                                                TODOS LOS PROVEEDORES
                                            </SelectItem>
                                            {suppliers.map(s => (
                                                <SelectItem key={s.id} value={s.id} className="text-[9px] font-bold uppercase rounded-xl transition-all data-[state=checked]:bg-blue-600 data-[state=checked]:text-white">
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-1.5 bg-slate-50/80 p-0.5 rounded-full border border-slate-100 shadow-sm transition-all hover:bg-slate-100/50">
                                    <div className="pl-3 pr-0 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 grayscale opacity-70">
                                        <Filter size={11} /> STOCK:
                                    </div>
                                    <Select onValueChange={(val: any) => setStockFilter(val)} value={stockFilter}>
                                        <SelectTrigger className="bg-white border-none rounded-full h-7 text-[9px] font-black uppercase px-3 min-w-[100px] shadow-sm focus:ring-2 focus:ring-blue-100 transition-all border-slate-100">
                                            <SelectValue placeholder="TODO" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                                            <SelectItem value="ALL" className="text-[9px] font-bold uppercase rounded-xl transition-all data-[state=checked]:bg-blue-600 data-[state=checked]:text-white">TODO EL STOCK</SelectItem>
                                            <SelectItem value="OUT" className="text-[9px] font-bold uppercase rounded-xl transition-all data-[state=checked]:bg-red-600 data-[state=checked]:text-white">FALTANTES (0)</SelectItem>
                                            <SelectItem value="LOW" className="text-[9px] font-bold uppercase rounded-xl transition-all data-[state=checked]:bg-amber-500 data-[state=checked]:text-white">STOCK BAJO (1-5)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 pr-4 -mr-4 h-full">
                            {isLoadingProducts ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                    <Loader2 className="animate-spin text-blue-500" size={32} />
                                    <p className="text-xs font-bold uppercase tracking-widest">Cargando productos...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 pb-4">
                                    {products.map((product, idx) => {
                                        const isOut = product.current_stock <= 0;
                                        const isLow = product.current_stock > 0 && product.current_stock <= 5;
                                        return (
                                            <div key={`${product.id}-${idx}`} className="flex flex-col gap-1">
                                                <div
                                                    onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                                                    className={cn(
                                                        "w-full text-left p-4 rounded-2xl border border-slate-100 flex justify-between items-center group transition-all bg-white shadow-sm cursor-pointer",
                                                        expandedProduct === product.id ? "border-blue-300 ring-2 ring-blue-50" : "hover:border-blue-200 hover:bg-blue-50/30"
                                                    )}
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <p className="font-bold text-slate-900 leading-tight text-base">{product.name}</p>
                                                            {isOut && <Badge className="bg-red-50 text-red-600 border-red-100 h-5 text-[8px] font-black uppercase tracking-widest px-1.5 shadow-none">Sin Stock</Badge>}
                                                            {isLow && <Badge className="bg-amber-50 text-amber-600 border-amber-100 h-5 text-[8px] font-black uppercase tracking-widest px-1.5 shadow-none">Stock Bajo</Badge>}
                                                        </div>

                                                        <div className="flex flex-wrap gap-2 items-center">
                                                            {!selectedBranch && (
                                                                <div className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-200/60">
                                                                    <Package size={12} className="text-slate-400" />
                                                                    <span>Total: {product.current_stock}</span>
                                                                </div>
                                                            )}

                                                            {branches
                                                                .filter(b => !catalogBranchFilter || b.id === catalogBranchFilter)
                                                                .map(b => {
                                                                    const branchStock = (product as any).branches?.find((pb: any) => pb.id === b.id)?.stock ?? 0;
                                                                    return (
                                                                        <div key={b.id} className={cn(
                                                                            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold uppercase border shadow-sm",
                                                                            catalogBranchFilter
                                                                                ? "bg-blue-50 text-blue-700 border-blue-100 ring-4 ring-blue-50/50 transition-all scale-105"
                                                                                : "bg-white text-slate-500 border-slate-100"
                                                                        )}>
                                                                            <span className={cn(catalogBranchFilter ? "text-blue-400" : "text-slate-300")}>{b.name}:</span>
                                                                            <span className={cn(branchStock <= 0 ? "text-red-500" : branchStock <= 5 ? "text-amber-500" : catalogBranchFilter ? "text-blue-700" : "text-slate-600")}>
                                                                                {branchStock}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}

                                                            {product.sku && (
                                                                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-tighter px-2 border-l border-slate-200 ml-1">
                                                                    SKU: {product.sku}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCart(product);
                                                        }}
                                                        className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm cursor-pointer"
                                                    >
                                                        <Plus size={20} />
                                                    </div>
                                                </div>

                                                {/* DESPLIEGUE DE VARIANTES (ESTILO INVENTARIO) */}
                                                {expandedProduct === product.id && product.variants && product.variants.length > 0 && (
                                                    <div className="mx-4 mt-1 bg-slate-50/50 rounded-[1.5rem] border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 mb-2">
                                                        <table className="w-full text-[10px] text-left">
                                                            <thead className="bg-slate-100/80 border-b border-slate-200">
                                                                <tr className="font-black text-slate-400 uppercase tracking-tighter">
                                                                    <th className="px-4 py-2">Color / Talle</th>
                                                                    {branches.map(b => (
                                                                        <th key={b.id} className="px-3 py-2 text-center">{b.name}</th>
                                                                    ))}
                                                                    <th className="px-3 py-2 text-right">TOTAL</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {product.variants?.map((v, vIdx) => (
                                                                    <tr key={`${v._id}-${vIdx}`} className="border-b border-slate-100 hover:bg-white/60 transition-colors">
                                                                        <td className="px-4 py-2 font-bold text-slate-700 uppercase">{v.color} / {v.size}</td>
                                                                        {branches.map(b => {
                                                                            const vStocks = (v as any).branch_stocks || {};
                                                                            // Si es un Map de Mongoose, lo manejamos como tal, si no como objeto
                                                                            const bStock = typeof vStocks.get === 'function' ? vStocks.get(b.id) : vStocks[b.id] ?? 0;
                                                                            return (
                                                                                <td key={b.id} className="px-3 py-2 text-center font-mono">
                                                                                    {bStock}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                        <td className="px-3 py-2 text-right font-black text-blue-600">{v.stock}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {products.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-3">
                                            <AlertCircle size={48} />
                                            <p className="text-sm font-black uppercase tracking-widest">No se encontraron productos</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                    </Card>

                    {/* PAGINATION CONTROLS (FLOTANDO FUERA DEL CARD) */}
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Mostrando {(currentPage - 1) * 20 + 1} a {Math.min(currentPage * 20, totalProducts)} de {totalProducts} productos (Pág. {currentPage} de {totalPages})
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1 || isLoadingProducts}
                                className="h-8 w-8 p-0 rounded-xl border-slate-200 bg-white shadow-sm"
                            >
                                <ChevronLeft size={14} className="text-slate-400" />
                            </Button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pNum = i + 1;
                                    if (totalPages > 5 && currentPage > 3) pNum = currentPage - 2 + i;
                                    if (pNum > totalPages) return null;
                                    if (pNum < 1) return null;

                                    return (
                                        <Button
                                            key={pNum}
                                            variant={currentPage === pNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(pNum)}
                                            disabled={isLoadingProducts}
                                            className={cn(
                                                "h-8 w-8 p-0 rounded-xl text-[10px] font-black transition-all shadow-sm",
                                                currentPage === pNum
                                                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105 z-10"
                                                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                            )}
                                        >
                                            {pNum}
                                        </Button>
                                    );
                                })}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || isLoadingProducts}
                                className="h-8 w-8 p-0 rounded-xl border-slate-200 bg-white shadow-sm"
                            >
                                <ChevronRight size={14} className="text-slate-400" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* === COLUMNA DERECHA: DETALLE DE ENTRADA === */}
                <Card className="flex flex-col p-5 border-none shadow-xl bg-slate-50 rounded-[2rem] overflow-hidden">
                    <div className="mb-6">
                        <div className="flex items-center justify-between gap-4">
                            <h3 className="font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800 text-lg">
                                <ShoppingCart size={22} className="text-emerald-600" /> Resumen de Entrada
                            </h3>
                            <div className="flex items-center gap-3">
                                <Select value={selectedBranch || ''} onValueChange={setSelectedBranch}>
                                    <SelectTrigger className="w-[180px] h-9 bg-white border-slate-200 rounded-xl font-bold text-[10px] text-slate-600 focus:ring-blue-100 transition-all uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <Store size={14} className="text-slate-400" />
                                            <SelectValue placeholder="SUCURSAL DESTINO" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                        {branches.map(branch => (
                                            <SelectItem key={branch.id} value={branch.id} className="text-[10px] font-bold text-slate-600 focus:bg-slate-50 rounded-lg uppercase">
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Badge className="bg-emerald-100 text-emerald-700 h-7 text-[10px] font-black uppercase tracking-widest px-3 border-none shrink-0">
                                    {cart.length} ITEMS
                                </Badge>
                            </div>
                        </div>

                        {/* Control de Fecha de Modificación */}
                        <div className="mt-4 flex items-center justify-between px-4 py-2 bg-white/50 border border-slate-200 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={14} className="text-blue-500" />
                                <Label htmlFor="update-timestamp" className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer">
                                    ¿Actualizar fecha de edición en inventario?
                                </Label>
                            </div>
                            <Switch
                                id="update-timestamp"
                                checked={updateTimestamp}
                                onCheckedChange={setUpdateTimestamp}
                                className="data-[state=checked]:bg-blue-600 scale-75"
                            />
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-[1.5rem] border border-slate-200 mb-4 overflow-hidden flex flex-col shadow-inner">
                        <div className="grid grid-cols-12 gap-2 p-3 bg-slate-50/80 text-[10px] font-black text-slate-500 border-b uppercase tracking-widest">
                            <div className="col-span-5 pl-2">Producto</div>
                            <div className="col-span-2 text-center">Cant.</div>
                            <div className="col-span-3 text-center">Costo Unit.</div>
                            <div className="col-span-2 text-center">Subtotal</div>
                        </div>

                        <ScrollArea className="flex-1">
                            {cart.map((item, idx) => (
                                <div key={`${item.id}-${item.variant_id || 'base'}-${idx}`} className="border-b hover:bg-slate-50 transition-colors">
                                    <div className="grid grid-cols-12 gap-2 p-2 items-center text-sm">
                                        <div className="col-span-5 pl-2">
                                            <p className="truncate font-bold text-slate-800 text-[11px] leading-snug" title={item.name}>{item.name}</p>
                                            <div className="flex items-center gap-2">
                                                {item.sku && (
                                                    <span className="text-[8px] font-mono font-black text-slate-400 uppercase bg-slate-100 px-1 rounded-sm">
                                                        {item.sku}
                                                    </span>
                                                )}
                                                {item.variant_name && (
                                                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                                                        {item.variant_name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={item.quantity}
                                                onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0, item.variant_id, item.variant_name)}
                                                className="h-8 text-center px-1 font-mono text-xs border-slate-200"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <div className="relative">
                                                <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">$</span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    value={item.cost}
                                                    onChange={e => updateItem(item.id, 'cost', parseFloat(e.target.value) || 0, item.variant_id, item.variant_name)}
                                                    className="h-8 pl-5 pr-1 text-right font-mono text-xs border-slate-200"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-between pl-2">
                                            <span className="font-bold text-slate-700 text-xs text-right flex-1 pr-2">
                                                ${(item.quantity * item.cost).toFixed(2)}
                                            </span>
                                            <button
                                                onClick={() => removeFromCart(item.id, item.variant_id, item.variant_name)}
                                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* SECCIÓN DE LOTES Y VENCIMIENTOS */}
                                    {item.manages_lots && (
                                        <div className="grid grid-cols-12 gap-2 px-3 pb-3 -mt-1 animate-in slide-in-from-top-1 duration-200">
                                            <div className="col-span-5 flex items-center gap-2">
                                                <div className="h-6 w-1 bg-amber-400 rounded-full" />
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-amber-600 uppercase">Lote:</span>
                                                    <Input
                                                        value={item.lot_number}
                                                        onChange={e => updateItem(item.id, 'lot_number', e.target.value, item.variant_id, item.variant_name)}
                                                        placeholder="Nº Lote..."
                                                        className="h-7 text-[10px] font-bold border-amber-100 bg-amber-50/30 focus:bg-white transition-all uppercase"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-blue-600 uppercase">Vencimiento:</span>
                                                    <Input
                                                        type="date"
                                                        value={item.expiration_date}
                                                        onChange={e => updateItem(item.id, 'expiration_date', e.target.value, item.variant_id, item.variant_name)}
                                                        className="h-7 text-[10px] font-bold border-blue-100 bg-blue-50/30 focus:bg-white transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-3 flex items-end">
                                                <Badge className="bg-slate-100 text-slate-500 h-6 text-[8px] font-black uppercase tracking-widest px-2 border-none mb-0.5">
                                                    Control Activo
                                                </Badge>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {cart.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 italic gap-2">
                                    <Plus size={32} className="opacity-20" />
                                    <p>Agrega productos desde el catálogo.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Estimada</span>
                            <div className="text-2xl font-black text-slate-900 leading-none">
                                ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={cart.length === 0 || isPending}
                            className="gap-2 bg-slate-900 hover:bg-black text-white px-8 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200 transition-all active:scale-95"
                        >
                            {isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {isPending ? "REGISTRANDO..." : "CONFIRMAR ENTRADA"}
                        </Button>
                    </div>
                </Card>
            </div>
            {/* MODAL DE SELECCIÓN DE VARIANTES */}
            <Dialog open={isVariantModalOpen} onOpenChange={setIsVariantModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-slate-50 to-white shrink-0">
                        <DialogTitle className="font-black uppercase tracking-tighter text-lg md:text-xl text-slate-900">
                            Seleccionar Variantes
                        </DialogTitle>
                        <DialogDescription className="text-[10px] md:text-xs font-medium text-slate-500">
                            {selectedProductForVariants?.name} - Marcá los talles/colores que vas a cargar.
                        </DialogDescription>
                    </DialogHeader>

                    <Separator className="opacity-50" />

                    <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="space-y-2">
                            {selectedProductForVariants?.variants?.map((variant, idx) => {
                                const selectionKey = `${variant._id}-${idx}`;
                                return (
                                    <div
                                        key={selectionKey}
                                        onClick={() => setVariantSelections(prev => ({ ...prev, [selectionKey]: !prev[selectionKey] }))}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer",
                                            variantSelections[selectionKey]
                                                ? "border-blue-500 bg-blue-50/50"
                                                : "border-slate-100 bg-white hover:border-slate-200"
                                        )}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase text-slate-800 tracking-tight">
                                                {variant.color} / {variant.size}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                Stock actual: {variant.stock}
                                            </span>
                                        </div>
                                        <div className={cn(
                                            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                                            variantSelections[selectionKey] ? "bg-blue-600 border-blue-600" : "border-slate-200"
                                        )}>
                                            {variantSelections[selectionKey] && <Check size={12} className="text-white" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <DialogFooter className="p-4 bg-slate-50 gap-2 shrink-0">
                        <Button
                            variant="ghost"
                            onClick={() => setIsVariantModalOpen(false)}
                            className="rounded-xl font-bold uppercase text-[9px] md:text-[10px] tracking-widest h-10"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={addVariantsToCart}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest h-10 shadow-lg shadow-blue-200 flex-1"
                        >
                            Agregar Selección
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
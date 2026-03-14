
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Search,
    Filter,
    Zap,
    CheckCircle2,
    Loader2,
    X,
    Tag,
    Package,
    ArrowUpDown,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ImageOff,
    Check,
    MessageCircle,
    Users,
    Truck,
    Wallet,
    Send,
    ShieldCheck
} from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from 'sonner'
import { productService } from '@/services/productService'
import { customerService } from '@/services/customerService'
import { supplierService } from '@/services/supplierService'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface MassUpdateManagerProps {
    orgId: string;
    slug: string;
    categories: any[];
    suppliers: any[];
    priceLists: any[];
    settings: any;
    userRole?: string;
    permissions?: any[];
}

export function MassUpdateManager({ orgId, slug, categories, suppliers, priceLists, settings, userRole, permissions }: MassUpdateManagerProps) {
    // 0. Tabs State - Filter based on settings AND permissions
    const disabledTabs = settings?.disabled_tabs || [];
    let availableTabs = [
        { id: 'prices', name: 'Actualización de Precios' },
        { id: 'messaging', name: 'Mensajería Masiva' }
    ].filter(t => !disabledTabs.includes(t.id));

    // Role Permission Enforcement
    if (userRole !== 'admin') {
        const modulePerms = permissions?.find((p: any) => p.module === 'mass-update');
        if (!modulePerms || !modulePerms.view) {
            availableTabs = [];
        } else if (modulePerms.tabs && modulePerms.tabs.length > 0) {
            const allowedTabIds = modulePerms.tabs.filter((t: any) => t.enabled).map((t: any) => t.name);
            availableTabs = availableTabs.filter(t => allowedTabIds.includes(t.id));
        }
    }

    const [activeTab, setActiveTab] = useState(availableTabs[0]?.id || '')

    if (availableTabs.length === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6 border border-rose-100 shadow-sm">
                    <ShieldCheck size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Acceso Restringido</h2>
                <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium">No tienes permisos habilitados en tu rol para visualizar este módulo.</p>
            </div>
        )
    }
    const [activeMsgSubTab, setActiveMsgSubTab] = useState('customers')

    // 1. Estados de Filtro y Datos (PRECIOS)
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
    const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set())
    const [sortBy, setSortBy] = useState('sku')
    const [sortOrder, setSortOrder] = useState('asc')
    const [page, setPage] = useState(1)
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })

    // 2. Estados de Filtro y Datos (MENSAJERÍA)
    const [msgData, setMsgData] = useState<any[]>([])
    // Removed rawMsgData as we will paginate server-side
    const [msgLoading, setMsgLoading] = useState(false)
    const [msgSearch, setMsgSearch] = useState('')
    const [msgDebouncedSearch, setMsgDebouncedSearch] = useState('')

    // New Filters
    const [msgFilterStatus, setMsgFilterStatus] = useState('all') // all, debt, clean
    const [msgFilterMaturity, setMsgFilterMaturity] = useState('all') // all, 30, 60, 90

    // Pagination for Messaging
    const [msgPage, setMsgPage] = useState(1);
    const [msgPagination, setMsgPagination] = useState({ total: 0, totalPages: 1 });


    // 3. Selección
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set())

    // 4. Configuración de Actualización (PRECIOS)
    const [targetField, setTargetField] = useState<'price' | 'cost'>('price')
    const [updateType, setUpdateType] = useState<'fixed' | 'percentage'>('percentage')
    const [updateValue, setUpdateValue] = useState<string>('')
    const [selectedPriceLists, setSelectedPriceLists] = useState<Set<string>>(new Set(['BASE']))
    const [isUpdating, setIsUpdating] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [rubroOpen, setRubroOpen] = useState(false)
    const [supplierOpen, setSupplierOpen] = useState(false)

    // 5. Configuración de Mensajería
    const [msgTemplate, setMsgTemplate] = useState('debt_reminder')
    const [customMsg, setCustomMsg] = useState('')

    // Debounce Searches
    useEffect(() => {
        const handler = setTimeout(() => {
            setPage(1)
            setDebouncedSearch(searchTerm)
        }, 300)
        return () => clearTimeout(handler)
    }, [searchTerm])

    useEffect(() => {
        const handler = setTimeout(() => {
            setMsgPage(1) // Reset page on search
            setMsgDebouncedSearch(msgSearch)
        }, 300)
        return () => clearTimeout(handler)
    }, [msgSearch])

    // On Msg Tab/SubTab Change, Reset Page
    useEffect(() => {
        setMsgPage(1);
        setSelectedMsgIds(new Set()); // Clear selection on tab switch
    }, [activeMsgSubTab]);


    // Fetch Products
    const fetchProducts = useCallback(async () => {
        setLoading(true)
        try {
            const params: any = { page, limit: 50, search: debouncedSearch, sortBy, sortOrder }
            if (selectedCategories.size > 0) {
                params.categoryId = Array.from(selectedCategories).join(',')
            }
            if (selectedSuppliers.size > 0) {
                params.supplierId = Array.from(selectedSuppliers).join(',')
            }
            const result = await productService.getAll(orgId, params)
            setProducts(result.data || [])
            setPagination(result.pagination || { total: 0, totalPages: 1 })
        } catch (error) { toast.error('Error al cargar productos') }
        finally { setLoading(false) }
    }, [orgId, page, debouncedSearch, selectedCategories, selectedSuppliers, sortBy, sortOrder])

    // Fetch Messaging Data (Customers/Suppliers) - SERVER PAGINATED
    const fetchMessagingData = useCallback(async () => {
        setMsgLoading(true)
        try {
            const params: any = {
                page: msgPage,
                limit: 50,
                search: msgDebouncedSearch,
                debtFilter: msgFilterStatus === 'all' ? undefined : (msgFilterStatus === 'debt' ? 'debtor' : 'non_debtor'),
                maturityDays: msgFilterMaturity === 'all' ? undefined : parseInt(msgFilterMaturity)
            }

            let response: any;
            if (activeMsgSubTab === 'customers') {
                response = await customerService.getAll(orgId, params)
            } else {
                response = await supplierService.getAll(orgId, params)
            }

            // Handle paginated or raw
            const data = (response as any).data || (Array.isArray(response) ? response : []);
            const pagination = (response as any).pagination || { total: 0, totalPages: 1, page: 1 };

            setMsgData(data)
            setMsgPagination(pagination)

        } catch (error) { toast.error('Error al cargar datos de mensajería') }
        finally { setMsgLoading(false) }
    }, [orgId, activeMsgSubTab, msgPage, msgDebouncedSearch, msgFilterStatus, msgFilterMaturity])

    // Trigger Fetch when dependencies change
    useEffect(() => {
        if (activeTab === 'prices') fetchProducts()
        else fetchMessagingData()
    }, [activeTab, fetchProducts, fetchMessagingData])

    // Handlers
    const toggleAllSelection = (checked: boolean) => {
        if (checked) setSelectedIds(new Set(products.map(p => p.id)))
        else setSelectedIds(new Set())
    }

    const toggleMsgAllSelection = (checked: boolean) => {
        if (checked) setSelectedMsgIds(new Set(msgData.map(m => m.id)))
        else setSelectedMsgIds(new Set())
    }

    const calculatePreview = (current: number) => {
        const val = parseFloat(updateValue)
        if (isNaN(val) || val === 0) return current
        if (updateType === 'fixed') return current + val
        if (updateType === 'percentage') return current * (1 + val / 100)
        return current
    }

    const togglePriceList = (id: string) => {
        const newSelected = new Set(selectedPriceLists)
        if (newSelected.has(id)) newSelected.delete(id)
        else newSelected.add(id)
        setSelectedPriceLists(newSelected)
    }

    const getVencimientoInfo = (lastDebtDate: string | Date | undefined, balance: number) => {
        if (!lastDebtDate || balance <= 0) return { days: '-', color: 'text-slate-300' };

        const start = new Date(lastDebtDate);
        const today = new Date();
        start.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const remaining = 30 - diffDays;

        let color = 'text-emerald-500 font-bold';
        if (remaining <= 5 && remaining >= 0) color = 'text-orange-500 font-black';
        if (remaining < 0) color = 'text-red-600 font-black';

        return { days: remaining, color };
    };

    const handleUpdateClick = () => {
        if (selectedIds.size === 0) return toast.error('Selecciona al menos un producto')
        if (!updateValue || parseFloat(updateValue) === 0) return toast.error('Ingresa un valor de actualización')
        setShowConfirmModal(true)
    }

    const handleConfirmUpdate = async () => {
        setIsUpdating(true)
        setShowConfirmModal(false)
        try {
            const updates = Array.from(selectedPriceLists).map(listId => ({
                list_id: listId === 'BASE' ? undefined : listId,
                target: targetField,
                type: updateType,
                value: parseFloat(updateValue)
            }))

            const payload = {
                selection: { type: 'ids', values: Array.from(selectedIds) },
                updates
            }

            const result = await productService.massUpdate(payload)

            toast.success(`Actualización exitosa (${result.updatedCount || selectedIds.size} productos)`)
            fetchProducts()
            setSelectedIds(new Set())
            setUpdateValue('')
            fetchProducts()
        } catch (error: any) {
            toast.error('Error al actualizar precios: ' + (error.message || ''))
        } finally {
            setIsUpdating(false)
        }
    }

    const handleSendWhatsApp = () => {
        if (selectedMsgIds.size === 0) return toast.warning('Seleccioná destinatarios')
        const items = msgData.filter(m => selectedMsgIds.has(m.id))

        items.forEach(item => {
            if (!item.phone) return
            let message = ""
            if (msgTemplate === 'debt_reminder') {
                const balance = item.credit_balance || item.balance || 0
                message = `Hola ${item.name}, te contactamos de la administración. Te recordamos que posees un saldo pendiente de $${balance.toLocaleString('es-AR')}. Quedamos a tu disposición.`
            } else {
                message = customMsg
            }

            const cleanPhone = item.phone.replace(/\D/g, '')
            const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
            window.open(url, '_blank')
        })
        toast.success(`Se abrieron ${items.length} ventanas de WhatsApp`)
    }

    return (
        <div className="w-full space-y-6">

            {/* TABS PRINCIPALES */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-2 w-full justify-start h-auto p-1 bg-slate-100 rounded-2xl border border-slate-200/60 shadow-none transition-all duration-300">
                    {!disabledTabs.includes('prices') && (
                        <TabsTrigger
                            value="prices"
                            className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold text-[10px] uppercase tracking-widest transition-all duration-300"
                        >
                            <Zap size={14} className="mr-2" /> Actualización de Precios
                        </TabsTrigger>
                    )}
                    {!disabledTabs.includes('messaging') && (
                        <TabsTrigger
                            value="messaging"
                            className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold text-[10px] uppercase tracking-widest transition-all duration-300"
                        >
                            <MessageCircle size={14} className="mr-2" /> Mensajería Masiva
                        </TabsTrigger>
                    )}
                </TabsList>

                <div>
                    {/* CONTENIDO PRECIOS */}
                    {!disabledTabs.includes('prices') && (
                        <TabsContent value="prices" className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            {/* TOOLBAR */}
                            <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                                {/* BUSQUEDA (ESTILO INVENTARIO) */}
                                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 flex-[2] min-w-[250px]">
                                    <div className="px-3 h-9 bg-slate-200 rounded-lg flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase border border-slate-300">
                                        <Search size={14} /> BUSCAR
                                    </div>
                                    <Input placeholder="Nombre o SKU..." className="bg-transparent border-0 focus-visible:ring-0 text-slate-900 text-sm h-9 shadow-none flex-1" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>

                                {/* FILTRO RUBROS (MULTISELECT + ESTILO SELECT) */}
                                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Package size={10} /> Rubros:</div>
                                    <Popover open={rubroOpen} onOpenChange={setRubroOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[150px] justify-between shadow-sm focus:ring-2 focus:ring-indigo-500/20 hover:bg-slate-50 group"
                                            >
                                                <span className="mr-2 truncate max-w-[120px]">
                                                    {selectedCategories.size === 0
                                                        ? "TODOS"
                                                        : selectedCategories.size === 1
                                                            ? categories.find(c => selectedCategories.has(c.id || c._id))?.name
                                                            : `${selectedCategories.size} SELECCIONADOS`
                                                    }
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {selectedCategories.size > 0 && (
                                                        <Badge variant="secondary" className="h-5 px-1.5 bg-indigo-50 text-indigo-600 font-bold text-[9px] rounded-md border border-indigo-100">
                                                            {selectedCategories.size}
                                                        </Badge>
                                                    )}
                                                    <ChevronDown className="size-4 opacity-50" />
                                                </div>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[280px] p-0 rounded-2xl border-slate-200 shadow-2xl overflow-hidden" align="start">
                                            <Command>
                                                <CommandInput placeholder="Buscar rubro..." className="text-[10px] font-bold uppercase h-11" />
                                                <CommandList className="max-h-[300px]">
                                                    <CommandEmpty className="py-6 text-center text-[10px] font-black text-slate-400 uppercase">No hay rubros.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            onSelect={() => {
                                                                setSelectedCategories(new Set());
                                                                setPage(1);
                                                            }}
                                                            className="flex items-center gap-2 px-3 py-3 cursor-pointer focus:bg-slate-50"
                                                        >
                                                            <Checkbox
                                                                checked={selectedCategories.size === 0}
                                                                className="data-[state=checked]:bg-indigo-600 border-slate-300"
                                                            />
                                                            <span className="text-[10px] font-black uppercase text-slate-700">TODOS LOS RUBROS</span>
                                                        </CommandItem>
                                                        {categories.map((c) => {
                                                            const catId = c.id || c._id;
                                                            return (
                                                                <CommandItem
                                                                    key={catId}
                                                                    onSelect={() => {
                                                                        const newSet = new Set(selectedCategories);
                                                                        if (newSet.has(catId)) newSet.delete(catId);
                                                                        else newSet.add(catId);
                                                                        setSelectedCategories(newSet);
                                                                        setPage(1);
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-3 cursor-pointer focus:bg-slate-50"
                                                                >
                                                                    <Checkbox
                                                                        checked={selectedCategories.has(catId)}
                                                                        className="data-[state=checked]:bg-indigo-600 border-slate-300 pointer-events-none"
                                                                    />
                                                                    <span className="text-[10px] font-black uppercase text-slate-700">{c.name}</span>
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* FILTRO PROVEEDORES (MULTISELECT + ESTILO SELECT) */}
                                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Truck size={10} /> Proveedores:</div>
                                    <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[150px] justify-between shadow-sm focus:ring-2 focus:ring-emerald-500/20 hover:bg-slate-50 group"
                                            >
                                                <span className="mr-2 truncate max-w-[120px]">
                                                    {selectedSuppliers.size === 0
                                                        ? "TODOS"
                                                        : selectedSuppliers.size === 1
                                                            ? suppliers.find(s => selectedSuppliers.has(s.id || s._id))?.name
                                                            : `${selectedSuppliers.size} SELECCIONADOS`
                                                    }
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {selectedSuppliers.size > 0 && (
                                                        <Badge variant="secondary" className="h-5 px-1.5 bg-emerald-50 text-emerald-600 font-bold text-[9px] rounded-md border border-emerald-100">
                                                            {selectedSuppliers.size}
                                                        </Badge>
                                                    )}
                                                    <ChevronDown className="size-4 opacity-50" />
                                                </div>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[280px] p-0 rounded-2xl border-slate-200 shadow-2xl overflow-hidden" align="start">
                                            <Command>
                                                <CommandInput placeholder="Buscar proveedor..." className="text-[10px] font-bold uppercase h-11" />
                                                <CommandList className="max-h-[300px]">
                                                    <CommandEmpty className="py-6 text-center text-[10px] font-black text-slate-400 uppercase">No hay proveedores.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            onSelect={() => {
                                                                setSelectedSuppliers(new Set());
                                                                setPage(1);
                                                            }}
                                                            className="flex items-center gap-2 px-3 py-3 cursor-pointer focus:bg-slate-50"
                                                        >
                                                            <Checkbox
                                                                checked={selectedSuppliers.size === 0}
                                                                className="data-[state=checked]:bg-emerald-600 border-slate-300"
                                                            />
                                                            <span className="text-[10px] font-black uppercase text-slate-700">TODOS LOS PROVEEDORES</span>
                                                        </CommandItem>
                                                        {suppliers.map((s) => {
                                                            const supId = s.id || s._id;
                                                            return (
                                                                <CommandItem
                                                                    key={supId}
                                                                    onSelect={() => {
                                                                        const newSet = new Set(selectedSuppliers);
                                                                        if (newSet.has(supId)) newSet.delete(supId);
                                                                        else newSet.add(supId);
                                                                        setSelectedSuppliers(newSet);
                                                                        setPage(1);
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-3 cursor-pointer focus:bg-slate-50"
                                                                >
                                                                    <Checkbox
                                                                        checked={selectedSuppliers.has(supId)}
                                                                        className="data-[state=checked]:bg-emerald-600 border-slate-300 pointer-events-none"
                                                                    />
                                                                    <span className="text-[10px] font-black uppercase text-slate-700">{s.name}</span>
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* FILTRO ORDEN (ESTILO INVENTARIO) */}
                                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><ArrowUpDown size={10} /> Orden:</div>
                                    <Select
                                        value={`${sortBy}-${sortOrder}`}
                                        onValueChange={(val) => {
                                            const [field, order] = val.split('-')
                                            setSortBy(field)
                                            setSortOrder(order)
                                            setPage(1)
                                        }}
                                    >
                                        <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[120px] shadow-sm focus:ring-2 focus:ring-indigo-500/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 shadow-xl overflow-hidden">
                                            <SelectItem value="sku-asc" className="text-[10px] font-black uppercase py-2">Sku Asc</SelectItem>
                                            <SelectItem value="sku-desc" className="text-[10px] font-black uppercase py-2">Sku Desc</SelectItem>
                                            <SelectItem value="name-asc" className="text-[10px] font-black uppercase py-2">Nombre (A-Z)</SelectItem>
                                            <SelectItem value="name-desc" className="text-[10px] font-black uppercase py-2">Nombre (Z-A)</SelectItem>
                                            <SelectItem value="updatedAt-desc" className="text-[10px] font-black uppercase py-2">Modif. (Reciente)</SelectItem>
                                            <SelectItem value="updatedAt-asc" className="text-[10px] font-black uppercase py-2">Modif. (Antigua)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="ml-auto flex items-center gap-2">
                                    {(selectedCategories.size > 0 || selectedSuppliers.size > 0) && (
                                        <Button variant="ghost" size="sm" onClick={() => { setSelectedCategories(new Set()); setSelectedSuppliers(new Set()); }} className="h-8 text-[9px] font-black text-rose-500 hover:bg-rose-50 uppercase">
                                            <X size={12} className="mr-1" /> Limpiar Filtros
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* GRID PRECIOS */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                                {/* AJUSTES (IZQUIERDA) */}
                                <div className="lg:col-span-1 space-y-4">
                                    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-2xl space-y-6">
                                        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center font-black transition-all",
                                                selectedIds.size > 0 ? "bg-slate-700 text-white animate-pulse" : "bg-slate-800 text-slate-600"
                                            )}>
                                                {selectedIds.size}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase text-slate-200">Seleccionados</span>
                                                <span className="text-[9px] font-bold text-slate-500 leading-none">Para actualizar</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-slate-500">Campo</label>
                                                <Select value={targetField} onValueChange={(v: any) => setTargetField(v)}>
                                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-[10px] font-black uppercase h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-slate-700">
                                                        <SelectItem value="price" className="text-white text-[10px] uppercase font-bold">Precio Principal</SelectItem>
                                                        <SelectItem value="cost" className="text-white text-[10px] uppercase font-bold">Costo</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-slate-500">Listas a Afectar</label>
                                                <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-2.5 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                                                    {/* Mostrar PRINCIPAL manual SOLO si no hay ninguna lista del sistema llamada 'Principal' */}
                                                    {!priceLists.some(l => l.name?.toLowerCase().includes('principal')) && (
                                                        <div
                                                            className="flex items-center gap-2 hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer group"
                                                            onClick={() => togglePriceList('BASE')}
                                                        >
                                                            <Checkbox
                                                                checked={selectedPriceLists.has('BASE')}
                                                                className="border-slate-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                                            />
                                                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 uppercase transition-colors">Principal</span>
                                                        </div>
                                                    )}
                                                    {priceLists.map(l => (
                                                        <div
                                                            key={l.id}
                                                            className="flex items-center gap-2 hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer group"
                                                            onClick={() => togglePriceList(l.id)}
                                                        >
                                                            <Checkbox
                                                                checked={selectedPriceLists.has(l.id)}
                                                                className="border-slate-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                                            />
                                                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 uppercase transition-colors">{l.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-500">Tipo</label>
                                                    <Select value={updateType} onValueChange={(v: any) => setUpdateType(v)}>
                                                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-[10px] font-black uppercase h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-700"><SelectItem value="percentage" className="text-white text-[10px] uppercase font-bold">%</SelectItem><SelectItem value="fixed" className="text-white text-[10px] uppercase font-bold">$</SelectItem></SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-500">Valor</label><Input type="number" placeholder="0" className="bg-slate-800 border-slate-700 text-white font-bold h-10 rounded-xl" value={updateValue} onChange={(e) => setUpdateValue(e.target.value)} /></div>
                                            </div>
                                        </div>
                                        <Button
                                            className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2"
                                            disabled={selectedIds.size === 0 || isUpdating || !updateValue || parseFloat(updateValue) === 0}
                                            onClick={handleUpdateClick}
                                        >
                                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap size={14} className="mr-2" /> ACTUALIZAR {selectedIds.size} PRODUCTOS</>}
                                        </Button>
                                    </div>
                                </div>
                                {/* TABLA (DERECHA) */}
                                <div className="lg:col-span-3 space-y-4">
                                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                                        <Table>
                                            <TableHeader className="bg-slate-50/50 h-10">
                                                <TableRow className="text-[10px] uppercase font-black border-slate-200">
                                                    <TableHead className="w-12 text-center"><Checkbox checked={selectedIds.size === products.length && products.length > 0} onCheckedChange={toggleAllSelection} /></TableHead>
                                                    <TableHead className="w-14">FOTO</TableHead>
                                                    <TableHead>PRODUCTO</TableHead>
                                                    <TableHead>RUBRO</TableHead>
                                                    <TableHead>SKU</TableHead>
                                                    <TableHead>MODIFICADO</TableHead>
                                                    <TableHead className="text-right">COSTO</TableHead>
                                                    {/* COLUMNAS DINÁMICAS DE PRECIOS */}
                                                    {selectedPriceLists.has('BASE') && !priceLists.some(l => l.name?.toLowerCase().includes('principal') && selectedPriceLists.has(l.id)) && (
                                                        <TableHead className="text-right">PRINCIPAL</TableHead>
                                                    )}
                                                    {priceLists.filter(l => selectedPriceLists.has(l.id)).map(l => (
                                                        <TableHead key={l.id} className="text-right whitespace-nowrap">{l.name}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading ? <TableRow><TableCell colSpan={7} className="h-64 text-center"><Loader2 className="animate-spin text-indigo-600 mx-auto" /><p className="text-[10px] text-slate-500 font-bold uppercase mt-2">Cargando catálogo...</p></TableCell></TableRow> :
                                                    products.map(p => (
                                                        <TableRow key={p.id} className={cn("border-slate-100 h-16 hover:bg-slate-50 transition-colors cursor-pointer", selectedIds.has(p.id) && "bg-slate-50/80")} onClick={() => { const newSelected = new Set(selectedIds); if (newSelected.has(p.id)) newSelected.delete(p.id); else newSelected.add(p.id); setSelectedIds(newSelected); }}>
                                                            <TableCell className="text-center p-4"><Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => { }} /></TableCell>
                                                            <TableCell className="p-4"><div className="w-10 h-10 relative rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">{p.image_url ? <Image src={p.image_url} alt="" fill className="object-cover" /> : <ImageOff size={16} className="text-slate-300" />}</div></TableCell>
                                                            <TableCell className="p-4 font-black text-slate-800 text-xs uppercase">{p.name}</TableCell>
                                                            <TableCell className="p-4"><Badge variant="secondary" className="text-[8px] uppercase font-black bg-slate-100 text-slate-500 border-none">{p.category_ids?.map((c: any) => typeof c === 'object' ? c.name : c).join(', ')}</Badge></TableCell>
                                                            <TableCell className="p-4 text-[10px] font-mono text-slate-400">{p.sku || '-'}</TableCell>
                                                            <TableCell className="p-4 text-[9px] font-bold text-slate-400 uppercase">
                                                                {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                                                            </TableCell>
                                                            <TableCell className="p-4 text-right">
                                                                <div className="flex flex-col items-end">
                                                                    {updateValue && parseFloat(updateValue) !== 0 && targetField === 'cost' && selectedIds.has(p.id) ? (
                                                                        <>
                                                                            <span className="text-[9px] text-slate-400 line-through">${p.cost?.toLocaleString('es-AR')}</span>
                                                                            <span className="text-xs font-black text-slate-700">${calculatePreview(p.cost || 0).toLocaleString('es-AR')}</span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-[11px] font-bold text-slate-500">${p.cost?.toLocaleString('es-AR')}</span>
                                                                    )}
                                                                </div>
                                                            </TableCell>

                                                            {/* PRECIOS DINÁMICOS */}
                                                            {selectedPriceLists.has('BASE') && !priceLists.some(l => l.name?.toLowerCase().includes('principal') && selectedPriceLists.has(l.id)) && (
                                                                <TableCell className="p-4 text-right">
                                                                    <div className="flex flex-col items-end">
                                                                        {updateValue && parseFloat(updateValue) !== 0 && (targetField === 'price' || targetField === 'cost') && selectedPriceLists.has('BASE') && selectedIds.has(p.id) ? (
                                                                            (() => {
                                                                                let projectedPrice = p.price || 0;
                                                                                if (targetField === 'price') {
                                                                                    projectedPrice = calculatePreview(p.price || 0);
                                                                                } else if (targetField === 'cost' && p.cost > 0) {
                                                                                    const newCost = calculatePreview(p.cost);
                                                                                    projectedPrice = (p.price || 0) * (newCost / p.cost);
                                                                                }
                                                                                return (
                                                                                    <>
                                                                                        <span className="text-[9px] text-slate-400 line-through">${p.price?.toLocaleString('es-AR')}</span>
                                                                                        <span className="text-sm font-black text-indigo-600">${projectedPrice.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                                                                                    </>
                                                                                );
                                                                            })()
                                                                        ) : (
                                                                            <span className="text-xs font-black text-slate-700">${p.price?.toLocaleString('es-AR')}</span>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            )}
                                                            {priceLists.filter(l => selectedPriceLists.has(l.id)).map(l => {
                                                                const listPriceEntry = p.pricing?.find((pr: any) => pr.list_id === l.id);
                                                                let listPrice = listPriceEntry?.price;
                                                                const entryCost = listPriceEntry?.cost || p.cost || 0;

                                                                // FALLBACK: Si es la lista Principal y no tiene precio, usar p.price
                                                                if ((listPrice === undefined || listPrice === null || listPrice === 0) && l.name?.toLowerCase().includes('principal')) {
                                                                    listPrice = p.price;
                                                                }

                                                                const isAfected = selectedPriceLists.has(l.id);
                                                                const hasUpdate = updateValue && parseFloat(updateValue) !== 0 && (targetField === 'price' || targetField === 'cost') && isAfected && selectedIds.has(p.id);

                                                                return (
                                                                    <TableCell key={l.id} className="p-4 text-right min-w-[100px]">
                                                                        <div className="flex flex-col items-end">
                                                                            {hasUpdate ? (
                                                                                (() => {
                                                                                    let projected = listPrice || 0;
                                                                                    if (targetField === 'price') {
                                                                                        projected = calculatePreview(listPrice || 0);
                                                                                    } else if (targetField === 'cost' && entryCost > 0) {
                                                                                        const newCost = calculatePreview(entryCost);
                                                                                        projected = (listPrice || 0) * (newCost / entryCost);
                                                                                    }
                                                                                    return (
                                                                                        <>
                                                                                            <span className="text-[9px] text-slate-400 line-through">{listPrice ? `$${listPrice.toLocaleString('es-AR')}` : '-'}</span>
                                                                                            <span className="text-sm font-black text-indigo-600">${projected.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                                                                                        </>
                                                                                    );
                                                                                })()
                                                                            ) : (
                                                                                <span className="text-xs font-black text-indigo-600">
                                                                                    {listPrice ? `$${listPrice.toLocaleString('es-AR')}` : '-'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="flex items-center justify-between p-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                                            Mostrando {(page - 1) * 50 + 1} a {Math.min(page * 50, pagination.total)} de {pagination.total} productos (Página {page} de {pagination.totalPages})
                                        </p>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="h-8 w-8 p-0 rounded-lg">
                                                <ChevronLeft size={14} />
                                            </Button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                                    let pNum = i + 1;
                                                    if (pagination.totalPages > 5 && page > 3) pNum = page - 2 + i;
                                                    if (pNum > pagination.totalPages) return null;
                                                    if (pNum < 1) return null;

                                                    return (
                                                        <Button
                                                            key={pNum}
                                                            variant={page === pNum ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => setPage(pNum)}
                                                            disabled={loading}
                                                            className={cn("h-8 w-8 p-0 rounded-lg text-[10px] font-black", page === pNum ? "bg-slate-900 text-white" : "text-slate-500")}
                                                        >
                                                            {pNum}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages || loading} className="h-8 w-8 p-0 rounded-lg">
                                                <ChevronRight size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    )}

                    {/* CONTENIDO MENSAJERÍA */}
                    {!disabledTabs.includes('messaging') && (
                        <TabsContent value="messaging" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            {/* SUB-TABS (Clientes/Proveedores) */}
                            <div className="mb-4 w-full max-w-2xl justify-start h-auto p-1 bg-slate-100 rounded-2xl flex gap-1 border border-slate-200/60 shadow-none transition-all duration-300">
                                <Button
                                    variant="ghost"
                                    onClick={() => setActiveMsgSubTab('customers')}
                                    className={cn(
                                        "flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest px-8 h-11 transition-all duration-300",
                                        activeMsgSubTab === 'customers'
                                            ? "bg-white text-blue-600 shadow-sm"
                                            : "text-slate-500 hover:bg-slate-200/50"
                                    )}
                                >
                                    <Users size={14} className="mr-2" /> Clientes
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setActiveMsgSubTab('suppliers')}
                                    className={cn(
                                        "flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest px-8 h-11 transition-all duration-300",
                                        activeMsgSubTab === 'suppliers'
                                            ? "bg-white text-blue-600 shadow-sm"
                                            : "text-slate-500 hover:bg-slate-200/50"
                                    )}
                                >
                                    <Truck size={14} className="mr-2" /> Proveedores
                                </Button>
                            </div>

                            {/* TOOLBAR MENSAJERÍA */}
                            {/* TOOLBAR MENSAJERÍA */}
                            <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 flex-[2] min-w-[250px]">
                                    <div className="px-3 h-9 bg-slate-200 rounded-lg flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase">
                                        <Search size={14} /> BUSCAR
                                    </div>
                                    <Input placeholder="Buscar por nombre o teléfono..." className="bg-transparent border-0 focus-visible:ring-0 text-slate-900 text-sm h-9 shadow-none flex-1" value={msgSearch} onChange={(e) => setMsgSearch(e.target.value)} />
                                </div>

                                {/* FILTRO ESTADO */}
                                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Filter size={10} /> ESTADO:</div>
                                    <Select value={msgFilterStatus} onValueChange={setMsgFilterStatus}>
                                        <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[100px] shadow-sm focus:ring-2 focus:ring-indigo-500/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 shadow-xl overflow-hidden">
                                            <SelectItem value="all" className="text-[10px] font-black uppercase py-2">TODOS</SelectItem>
                                            <SelectItem value="debt" className="text-[10px] font-black uppercase py-2">CON DEUDA</SelectItem>
                                            <SelectItem value="clean" className="text-[10px] font-black uppercase py-2">SIN DEUDA</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* FILTRO VENCIMIENTO */}
                                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Filter size={10} /> VENCIMIENTO:</div>
                                    <Select value={msgFilterMaturity} onValueChange={setMsgFilterMaturity}>
                                        <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[100px] shadow-sm focus:ring-2 focus:ring-indigo-500/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 shadow-xl overflow-hidden">
                                            <SelectItem value="all" className="text-[10px] font-black uppercase py-2">TODOS</SelectItem>
                                            <SelectItem value="30" className="text-[10px] font-black uppercase py-2">+30 DÍAS</SelectItem>
                                            <SelectItem value="60" className="text-[10px] font-black uppercase py-2">+60 DÍAS</SelectItem>
                                            <SelectItem value="90" className="text-[10px] font-black uppercase py-2">+90 DÍAS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* GRID MENSAJERÍA */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                                {/* PANEL MENSAJE (IZQUIERDA) */}
                                <div className="lg:col-span-1 space-y-4">
                                    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-2xl space-y-6">
                                        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black transition-all", selectedMsgIds.size > 0 ? "bg-green-600 text-white animate-pulse" : "bg-slate-800 text-slate-600")}>{selectedMsgIds.size}</div>
                                            <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-green-400">Destinatarios</span><span className="text-[9px] font-bold text-slate-500 leading-none">Para contactar</span></div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-slate-500">Plantilla de Mensaje</label>
                                                <Select value={msgTemplate} onValueChange={setMsgTemplate}>
                                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-[10px] font-black uppercase h-10 rounded-xl"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-slate-700">
                                                        <SelectItem value="debt_reminder" className="text-white text-[10px] uppercase font-bold">Recordatorio de Deuda</SelectItem>
                                                        <SelectItem value="custom" className="text-white text-[10px] uppercase font-bold">Mensaje Personalizado</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {msgTemplate === 'custom' && (
                                                <div className="space-y-1.5 animate-in fade-in duration-300">
                                                    <label className="text-[10px] font-black uppercase text-slate-500">Mensaje</label>
                                                    <textarea className="w-full bg-slate-800 border border-slate-700 text-white text-xs p-3 rounded-xl min-h-[100px] focus:ring-1 focus:ring-green-500" placeholder="Escribe aquí tu mensaje..." value={customMsg} onChange={(e) => setCustomMsg(e.target.value)} />
                                                </div>
                                            )}
                                        </div>
                                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2" disabled={selectedMsgIds.size === 0} onClick={handleSendWhatsApp}><Send size={16} /> ENVIAR WHATSAPP</Button>
                                        <p className="text-[9px] text-center text-slate-500 italic px-4">Esto abrirá una ventana de WhatsApp por cada destinatario seleccionado.</p>
                                    </div>
                                </div>
                                {/* TABLA CTAS CTES (DERECHA) */}
                                <div className="lg:col-span-3 space-y-4">
                                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                                        <Table>
                                            <TableHeader className="bg-slate-50/50 h-10">
                                                <TableRow className="text-[10px] uppercase font-black border-slate-200">
                                                    <TableHead className="w-12 text-center"><Checkbox checked={selectedMsgIds.size === msgData.length && msgData.length > 0} onCheckedChange={toggleMsgAllSelection} /></TableHead>
                                                    <TableHead>RAZÓN SOCIAL / NOMBRE</TableHead>
                                                    <TableHead>TELÉFONO</TableHead>
                                                    <TableHead className="text-center">VENCIMIENTO</TableHead>
                                                    <TableHead className="text-right">SALDO CC</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {msgLoading ? <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="animate-spin text-green-600 mx-auto" /><p className="text-[10px] text-slate-500 font-bold uppercase mt-2">Cargando cuentas...</p></TableCell></TableRow> :
                                                    msgData.length === 0 ? <TableRow><TableCell colSpan={5} className="h-48 text-center text-[10px] font-black text-slate-400 uppercase">No se encontraron deudores.</TableCell></TableRow> :
                                                        msgData.map(item => (
                                                            <TableRow key={item.id} className={cn("border-slate-100 h-16 hover:bg-slate-50 transition-colors cursor-pointer", selectedMsgIds.has(item.id) && "bg-slate-50/80")} onClick={() => { const newSelected = new Set(selectedMsgIds); if (newSelected.has(item.id)) newSelected.delete(item.id); else newSelected.add(item.id); setSelectedMsgIds(newSelected); }}>
                                                                <TableCell className="text-center p-4"><Checkbox checked={selectedMsgIds.has(item.id)} onCheckedChange={() => { }} /></TableCell>
                                                                <TableCell className="p-4"><div className="flex flex-col"><span className="font-black text-slate-800 text-xs uppercase">{item.name}</span><span className="text-[9px] text-slate-400">{item.tax_id || '-'}</span></div></TableCell>
                                                                <TableCell className="p-4 text-[10px] font-mono font-bold text-slate-600">{item.phone || 'S/T'}</TableCell>
                                                                <TableCell className="p-4 text-center">
                                                                    {(() => {
                                                                        const { days, color } = getVencimientoInfo(item.last_debt_date, (item.credit_balance || item.balance || 0));
                                                                        return <div className={cn("text-xs", color)}>{days}</div>
                                                                    })()}
                                                                </TableCell>
                                                                <TableCell className="p-4 text-right px-6"><Badge className={cn("font-black text-[11px] h-7 px-4 rounded-xl", (item.credit_balance || item.balance || 0) > 0 ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-600 border border-green-100")}>$ {(item.credit_balance || item.balance || 0).toLocaleString('es-AR')}</Badge></TableCell>
                                                            </TableRow>
                                                        ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="flex items-center justify-between p-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                                            Mostrando {(msgPage - 1) * 50 + 1} a {Math.min(msgPage * 50, msgPagination.total)} de {msgPagination.total} registros (Página {msgPage} de {msgPagination.totalPages})
                                        </p>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setMsgPage(p => Math.max(1, p - 1))} disabled={msgPage === 1 || msgLoading} className="h-8 w-8 p-0 rounded-lg">
                                                <ChevronLeft size={14} />
                                            </Button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.min(5, msgPagination.totalPages) }, (_, i) => {
                                                    let pNum = i + 1;
                                                    if (msgPagination.totalPages > 5 && msgPage > 3) pNum = msgPage - 2 + i;
                                                    if (pNum > msgPagination.totalPages) return null;
                                                    if (pNum < 1) return null;

                                                    return (
                                                        <Button
                                                            key={pNum}
                                                            variant={msgPage === pNum ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => setMsgPage(pNum)}
                                                            disabled={msgLoading}
                                                            className={cn("h-8 w-8 p-0 rounded-lg text-[10px] font-black", msgPage === pNum ? "bg-slate-900 text-white" : "text-slate-500")}
                                                        >
                                                            {pNum}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setMsgPage(p => Math.min(msgPagination.totalPages, p + 1))} disabled={msgPage === msgPagination.totalPages || msgLoading} className="h-8 w-8 p-0 rounded-lg">
                                                <ChevronRight size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    )}
                </div>
            </Tabs>

            {/* CONFIRMATION MODAL */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="max-w-4xl p-0 bg-white rounded-[2rem] overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-8 pb-4 bg-slate-50">
                        <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden">
                                <Zap size={20} />
                            </div>
                            Revisión de Actualización
                        </DialogTitle>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                            Estás por actualizar <span className="text-indigo-600 font-black">{selectedIds.size} productos</span>.
                            {parseFloat(updateValue) > 0 ? (
                                <> Se aplicará un <span className="text-rose-600 font-bold">RECARGO</span> del </>
                            ) : (
                                <> Se aplicará un <span className="text-emerald-600 font-bold">DESCUENTO</span> del </>
                            )}
                            <span className="text-slate-900 font-black">{Math.abs(parseFloat(updateValue))}{updateType === 'percentage' ? '%' : '$'}</span> en las listas seleccionadas.
                        </p>
                    </DialogHeader>

                    <div className="p-8 pt-0">
                        <ScrollArea className="h-[400px] rounded-2xl border border-slate-100 bg-white">
                            <Table>
                                <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                                    <TableRow className="text-[10px] uppercase font-black border-slate-200 h-10">
                                        <TableHead>PRODUCTO</TableHead>
                                        <TableHead>ULT. MOD.</TableHead>
                                        <TableHead className="text-right">VALOR ACTUAL</TableHead>
                                        <TableHead className="text-center w-12"></TableHead>
                                        <TableHead className="text-right">NUEVO VALOR</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.filter(p => selectedIds.has(p.id)).map(p => {
                                        const originalValue = targetField === 'cost' ? (p.cost || 0) : (p.price || 0);
                                        const newValue = calculatePreview(originalValue);

                                        return (
                                            <TableRow key={p.id} className="border-slate-50 h-14">
                                                <TableCell className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-800 text-[11px] uppercase truncate max-w-[250px]">{p.name}</span>
                                                        <span className="text-[9px] text-slate-400 font-mono">{p.sku}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-4 text-[9px] font-bold text-slate-400 uppercase">
                                                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                                                </TableCell>
                                                <TableCell className="p-4 text-right font-bold text-slate-400 text-xs text-nowrap">
                                                    $ {originalValue.toLocaleString('es-AR')}
                                                </TableCell>
                                                <TableCell className="p-4 text-center">
                                                    <ArrowUpDown size={12} className="text-slate-300 rotate-90 mx-auto" />
                                                </TableCell>
                                                <TableCell className="p-4 text-right font-black text-indigo-600 text-[13px] text-nowrap">
                                                    $ {newValue.toLocaleString('es-AR')}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>

                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between sm:justify-between px-8">
                        <Button variant="ghost" onClick={() => setShowConfirmModal(false)} className="rounded-xl h-12 font-black uppercase text-[10px] text-slate-400 hover:text-slate-600">
                            CANCELAR
                        </Button>
                        <Button onClick={handleConfirmUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 px-8 font-black uppercase text-[10px] shadow-lg shadow-indigo-100 flex items-center gap-2">
                            CONFIRMAR Y APLICAR CAMBIOS <Check size={16} />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}

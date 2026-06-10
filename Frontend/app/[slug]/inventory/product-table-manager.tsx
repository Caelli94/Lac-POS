'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Save, Loader2, ImageUp, X, RefreshCw, Plus, Search, Calculator, Store, Box, LayoutGrid, Check, AlertCircle, Trash2, ChevronsUpDown, ScanBarcode, Wand2, Tag, Package, ArrowUpDown, Eye, FolderPlus, Edit, ImageOff, Printer, ChevronLeft, ChevronRight, AlertTriangle, Settings2, WifiOff, Cloud, Globe } from 'lucide-react';
import { productService } from '@/services/productService';
import { posDB } from '@/lib/pos-db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InventorySettingsDialog } from './inventory-settings-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import Image from 'next/image';
import { ProductForm } from './new/product-form';
import {
    upsertCategoryAction,
    deleteCategoryAction,
    deleteProductAction,
    deleteProductsAction,
    updateProductVisibilityAction,
    getPriceListsAction,
    getBranchesAction
} from './new/actions';
import { cn } from '@/lib/utils';

export function ProductTableManager({ initialProducts, categories, suppliers, slug, orgId, customAttributesConfig, variantLabels = { color: 'Color', size: 'Talle' }, barcodeSettings, initialBranches = [], initialPriceLists = [], settings, currentUser }: any) {
    const [products, setProducts] = useState(initialProducts);
    const [branches, setBranches] = useState<any[]>(initialBranches);

    // Permission Logic
    const hasPermission = (tabName: string) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
        const rolePerms = currentUser.roleId?.permissions || [];
        const modulePerms = rolePerms.find((p: any) => p.module === 'inventory');
        if (!modulePerms) return false;
        const tab = modulePerms.tabs?.find((t: any) => t.name === tabName);
        return !!tab?.enabled;
    };

    const canCreate = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
        const rolePerms = currentUser.roleId?.permissions || [];
        const modulePerms = rolePerms.find((p: any) => p.module === 'inventory');
        return !!modulePerms?.create;
    }, [currentUser]);

    const canEdit = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
        const rolePerms = currentUser.roleId?.permissions || [];
        const modulePerms = rolePerms.find((p: any) => p.module === 'inventory');
        return !!modulePerms?.edit;
    }, [currentUser]);

    const canDelete = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
        const rolePerms = currentUser.roleId?.permissions || [];
        const modulePerms = rolePerms.find((p: any) => p.module === 'inventory');
        return !!modulePerms?.delete;
    }, [currentUser]);

    // Filter active price lists
    const activePriceLists = useMemo(() => (initialPriceLists || []).filter((l: any) => l.is_active), [initialPriceLists]);
    const [priceLists, setPriceLists] = useState<any[]>(activePriceLists);

    // Default selected list ID logic
    const [selectedListId, setSelectedListId] = useState<string>(() => {
        const main = activePriceLists.find((l: any) => l.name === 'PRINCIPAL');
        if (main) return main.id;
        if (activePriceLists.length > 0) return activePriceLists[0].id;
        return '';
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const [localCategories, setLocalCategories] = useState(categories);

    // Sync categories from props (if server revalidates)
    useEffect(() => { setLocalCategories(categories); }, [categories]);

    // Estados para modales auxiliares
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<{ id: string, name: string } | null>(null);
    const [categorySearchTerm, setCategorySearchTerm] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [categoryPage, setCategoryPage] = useState(1);
    const CAT_PAGE_SIZE = 10;

    const [isDeleteProductOpen, setIsDeleteProductOpen] = useState(false);
    const [isMassDeleteOpen, setIsMassDeleteOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [attributeFilters, setAttributeFilters] = useState<Record<string, string>>({});

    const [visibilityFilter, setVisibilityFilter] = useState('ALL');
    const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'OUT' | 'LOW' | 'HIGH'
    const [branchFilter, setBranchFilter] = useState('ALL'); // 'ALL' | branchId
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    // --- PAGINATION STATE ---
    const [page, setPage] = useState(1);
    const [isMounted, setIsMounted] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    // DEDUPLICATE LISTS FOR REACT KEYS
    const uniquePriceLists = useMemo(() => {
        const seen = new Set();
        return (priceLists || []).filter((l: any) => {
            const id = l.id || l._id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [priceLists]);

    const uniqueBranches = useMemo(() => {
        const seen = new Set();
        return (branches || []).map((b: any) => ({
            ...b,
            id: b.id || b._id?.toString() || b._id
        })).filter((b: any) => {
            const id = b.id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [branches]);

    const [sortBy, setSortBy] = useState<string>('sku');
    const [sortOrder, setSortOrder] = useState<string>('asc');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Debounce Search
    useEffect(() => {
        const handler = setTimeout(() => {
            setPage(1); // Reset page on search
            setDebouncedSearchTerm(searchTerm);
        }, 200);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Reset Page on Filter Change
    useEffect(() => { setPage(1); }, [branchFilter, stockFilter, visibilityFilter, sortBy, sortOrder]);

    // Fetch Products (Server Side or Offline Fallback)
    useEffect(() => {
        let isMounted = true;
        setIsLoadingProducts(true);

        // OFFLINE FALLBACK
        if (typeof window !== 'undefined' && !navigator.onLine) {
            posDB.getPaginatedItems('products', page, 50, debouncedSearchTerm).then(res => {
                if (isMounted) {
                    setProducts(res.data || []);
                    setTotalPages(Math.ceil(res.total / 50));
                    setTotalProducts(res.total);
                    setIsLoadingProducts(false);
                }
            });
            return;
        }

        productService.getAll(orgId, {
            page,
            limit: 50,
            search: debouncedSearchTerm,
            branch: branchFilter,
            stock: stockFilter,
            visibility: visibilityFilter,
            sortBy,
            sortOrder
        }).then(res => {
            if (isMounted) {
                setProducts(res.data || []);
                if (res.pagination) {
                    setTotalPages(res.pagination.totalPages);
                    setTotalProducts(res.pagination.total);
                }
                setIsLoadingProducts(false);
                // Sembrar DB local con resultados frescos por si acaso
                if (res.data?.length > 0) posDB.saveProducts(res.data);
            }
        });
        return () => { isMounted = false; };
    }, [orgId, page, debouncedSearchTerm, branchFilter, stockFilter, visibilityFilter, sortBy, sortOrder, categories]);

    // Remove client-side filteredProducts calculation. We use 'products' directly.
    const filteredProducts = products;

    const getSupplierName = (idOrObj: any) => {
        if (!idOrObj) return '-';
        if (typeof idOrObj === 'object' && idOrObj.name) return idOrObj.name;
        return suppliers.find((s: any) => s.id === idOrObj)?.name || '-';
    };

    const getRubroNames = (ids: any[]) => {
        if (!ids || ids.length === 0) return '-';
        return ids.map((item: any) => {
            if (typeof item === 'object' && item.name) return item.name;
            return categories.find((c: any) => c.id === item)?.name;
        }).filter(Boolean).join(', ');
    };

    const formatFecha = (iso: string) => {
        if (!iso) return '-';
        try { return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso)); }
        catch (e) { return '-'; }
    };

    // -- HANDLERS DE SELECCIÓN --
    const toggleAllSelection = (checked: boolean) => {
        if (checked) setSelectedIds(new Set(filteredProducts.map((p: any) => p.id)));
        else setSelectedIds(new Set());
    };

    const toggleRowSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const toggleRowExpansion = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedRows(newExpanded);
    };

    // -- HANDLERS DE CRUD --
    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return toast.error("Ingresá un nombre");
        setCategoryLoading(true);
        const res = await upsertCategoryAction(orgId, slug, { name: newCategoryName });
        if (res.success) {
            toast.success("Rubro creado");
            setLocalCategories([...localCategories, res.data]);
            setNewCategoryName('');
        } else if (res.error === "DUPLICADO") {
            setIsDuplicateAlertOpen(true);
        } else {
            toast.error(res.error);
        }
        setCategoryLoading(false);
    };

    const executeDeleteCategory = async () => {
        if (!categoryToDelete) return;
        setIsDeleting(true);
        const res = await deleteCategoryAction(orgId, slug, categoryToDelete.id);
        if (res.success) {
            setLocalCategories(localCategories.filter((c: any) => c.id !== categoryToDelete.id));
            setIsConfirmDeleteOpen(false);
            setCategoryToDelete(null);
            toast.success("Rubro eliminado");
        } else {
            toast.error(res.error);
        }
        setIsDeleting(false);
    };

    const handleConfirmDeleteProduct = async () => {
        if (!productToDelete) return;
        setIsDeleting(true);
        const res = await deleteProductAction(orgId, slug, productToDelete.id);
        if (res.success) {
            setProducts(products.filter((p: any) => p.id !== productToDelete.id));
            setIsDeleteProductOpen(false);
            toast.success("Eliminado");
        } else {
            toast.error(res.error);
        }
        setIsDeleting(false);
    };

    const handleConfirmMassDelete = async () => {
        setIsDeleting(true);
        const ids = Array.from(selectedIds);
        const res = await deleteProductsAction(orgId, slug, ids);
        if (res.success) {
            toast.success(`${ids.length} productos eliminados`);
            setProducts(products.filter((p: any) => !selectedIds.has(p.id)));
            setSelectedIds(new Set());
            setIsMassDeleteOpen(false);
        } else {
            toast.error(res.error);
        }
        setIsDeleting(false);
    };

    const handleToggleVisibility = async (productId: string, currentVal: boolean) => {
        const newVal = !currentVal;
        setProducts(products.map((p: any) => p.id === productId ? { ...p, is_visible: newVal } : p));
        const res = await updateProductVisibilityAction(orgId, slug, productId, newVal);
        if (!res.success) {
            toast.error("Error al actualizar");
            setProducts(products.map((p: any) => p.id === productId ? { ...p, is_visible: currentVal } : p));
        }
    };

    const handleProductSaved = (saved: any) => {
        if (selectedProduct) setProducts(products.map((p: any) => p.id === saved.id ? saved : p));
        else setProducts([saved, ...products]);
        setIsDialogOpen(false);
    };

    // --- DELETED CLIENT SIDE FILTERING LOGIC ---
    // The previous useMemo hook for filteredProducts has been removed as filtering is now handled server-side.

    const filteredCategories = useMemo(() => {
        return localCategories.filter((c: any) =>
            c.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
        ).sort((a: any, b: any) => a.name.localeCompare(b.name));
    }, [categorySearchTerm, localCategories]);

    const paginatedCategories = useMemo(() => {
        const start = (categoryPage - 1) * CAT_PAGE_SIZE;
        return filteredCategories.slice(start, start + CAT_PAGE_SIZE);
    }, [filteredCategories, categoryPage]);

    const totalCatPages = Math.ceil(filteredCategories.length / CAT_PAGE_SIZE);

    useEffect(() => {
        setCategoryPage(1);
    }, [categorySearchTerm]);

    return (
        <div className="w-full space-y-4">
            {/* TOOLBAR */}
            {isMounted && !navigator.onLine && (
                <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl flex items-center gap-2 mb-2 animate-pulse">
                    <WifiOff size={14} className="text-amber-500" />
                    <span className="text-[10px] font-black text-amber-600 uppercase">Modo de Consulta Offline - Los datos mostrados corresponden a la última sincronización local.</span>
                </div>
            )}
            <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 flex-[2] min-w-[200px]">
                    <div className="px-3 h-9 bg-slate-200 rounded-lg flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase border border-slate-300">
                        <Search size={14} /> BUSCAR
                    </div>
                    <Input placeholder="Nombre o SKU..." className="bg-transparent border-0 focus-visible:ring-0 text-slate-900 text-sm h-9 shadow-none flex-1" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Tag size={10} /> Precio:</div>
                    <Select value={selectedListId} onValueChange={setSelectedListId}>
                        <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[120px] shadow-sm focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Lista" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[120px]">
                            {(uniquePriceLists || []).map(list => (
                                <SelectItem key={list.id} value={list.id} className="text-[10px] uppercase font-bold text-slate-700">
                                    {list.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* ORDENAR POR */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><ArrowUpDown size={10} /> Orden:</div>
                    <Select value={`${sortBy}-${sortOrder}`} onValueChange={(val) => {
                        const [field, order] = val.split('-');
                        setSortBy(field);
                        setSortOrder(order);
                    }}>
                        <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[100px] shadow-sm focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Orden" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[100px]">
                            <SelectItem value="sku-asc" className="text-[10px] uppercase font-bold text-slate-700">Sku Asc</SelectItem>
                            <SelectItem value="sku-desc" className="text-[10px] uppercase font-bold text-slate-700">Sku Desc</SelectItem>
                            <SelectItem value="name-asc" className="text-[10px] uppercase font-bold text-slate-700">Nombre (A-Z)</SelectItem>
                            <SelectItem value="name-desc" className="text-[10px] uppercase font-bold text-slate-700">Nombre (Z-A)</SelectItem>
                            <SelectItem value="updatedAt-desc" className="text-[10px] uppercase font-bold text-slate-700">Modif. (Reciente)</SelectItem>
                            <SelectItem value="updatedAt-asc" className="text-[10px] uppercase font-bold text-slate-700">Modif. (Antigua)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* FILTRO SUCURSAL */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Store size={10} /> Sucursal:</div>
                    <Select value={branchFilter} onValueChange={setBranchFilter}>
                        <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[120px] shadow-sm focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[150px]">
                            <SelectItem value="ALL" className="text-[10px] uppercase font-bold text-slate-700">TODAS</SelectItem>
                            {uniqueBranches.map(b => (
                                <SelectItem key={b.id} value={b.id} className="text-[10px] uppercase font-bold text-slate-700">{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* FILTRO STOCK */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Package size={10} /> Stock:</div>
                    <Select value={stockFilter} onValueChange={setStockFilter}>
                        <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[120px] shadow-sm focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[120px]">
                            <SelectItem value="ALL" className="text-[10px] uppercase font-bold text-slate-700">TODOS</SelectItem>
                            <SelectItem value="OUT" className="text-[10px] uppercase font-bold text-destructive">Sin Stock (0)</SelectItem>
                            <SelectItem value="LOW" className="text-[10px] uppercase font-bold text-amber-600">Poco Stock (1-5)</SelectItem>
                            <SelectItem value="HIGH" className="text-[10px] uppercase font-bold text-green-600">Normal (+6)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* FILTRO VISIBILIDAD WEB */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Eye size={10} /> Web:</div>
                    <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                        <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[120px] shadow-sm focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Estado Web" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[120px]">
                            <SelectItem value="ALL" className="text-[10px] uppercase font-bold text-slate-700">Todos</SelectItem>
                            <SelectItem value="VISIBLE" className="text-[10px] uppercase font-bold text-green-600">En Web</SelectItem>
                            <SelectItem value="HIDDEN" className="text-[10px] uppercase font-bold text-slate-400">Ocultos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2 ml-auto items-center">
                    {selectedIds.size > 0 && canDelete && (
                        <Button variant="destructive" size="sm" className="h-10 rounded-xl text-[10px] font-black uppercase" onClick={() => setIsMassDeleteOpen(true)}>
                            <Trash2 size={14} className="mr-2" /> Borrar ({selectedIds.size})
                        </Button>
                    )}

                    {canCreate && (
                        <Button onClick={() => { setSelectedProduct(null); setIsDialogOpen(true); }} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl">
                            <Plus size={16} className="mr-2" /> NUEVO PRODUCTO
                        </Button>
                    )}
                </div>
            </div>





            {/* FILTROS DE VARIANTES (SIEMPRE VISIBLES O CONDICIONALES?) */}
            <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-2xl border border-slate-200 mb-4 shadow-sm">
                <span className="text-[9px] font-black uppercase text-slate-400 pl-2">Filtrar Variantes:</span>

                {/* FILTRO 1: COLOR/MATERIAL */}
                <div className="relative group">
                    <Input
                        placeholder={variantLabels.color.toUpperCase()}
                        className="h-8 w-32 bg-slate-50 text-[10px] font-bold uppercase border-slate-200 focus:w-40 transition-all rounded-lg shadow-sm"
                        value={attributeFilters['AXIS_COLOR'] || ''}
                        onChange={(e) => setAttributeFilters(prev => ({ ...prev, 'AXIS_COLOR': e.target.value }))}
                    />
                    {attributeFilters['AXIS_COLOR'] && (
                        <button onClick={() => setAttributeFilters(prev => ({ ...prev, 'AXIS_COLOR': '' }))} className="absolute right-2 top-1.5 text-slate-300 hover:text-red-500"><X size={12} /></button>
                    )}
                </div>

                {/* FILTRO 2: TALLE/MEDIDA */}
                <div className="relative group">
                    <Input
                        placeholder={variantLabels.size.toUpperCase()}
                        className="h-8 w-32 bg-slate-50 text-[10px] font-bold uppercase border-slate-200 focus:w-40 transition-all rounded-lg shadow-sm"
                        value={attributeFilters['AXIS_SIZE'] || ''}
                        onChange={(e) => setAttributeFilters(prev => ({ ...prev, 'AXIS_SIZE': e.target.value }))}
                    />
                    {attributeFilters['AXIS_SIZE'] && (
                        <button onClick={() => setAttributeFilters(prev => ({ ...prev, 'AXIS_SIZE': '' }))} className="absolute right-2 top-1.5 text-slate-300 hover:text-red-500"><X size={12} /></button>
                    )}
                </div>

                {/* FILTROS EXTRA DEL PRODUCTO */}
                {customAttributesConfig && customAttributesConfig.map((attr: any, idx: number) => (
                    <div key={idx} className="relative group">
                        <Input
                            placeholder={attr.name.toUpperCase()}
                            className="h-8 w-32 bg-slate-50 text-[10px] font-bold uppercase border-slate-200 focus:w-40 transition-all rounded-lg shadow-sm"
                            value={attributeFilters[attr.name] || ''}
                            onChange={(e) => setAttributeFilters(prev => ({ ...prev, [attr.name]: e.target.value }))}
                        />
                        {attributeFilters[attr.name] && (
                            <button onClick={() => setAttributeFilters(prev => ({ ...prev, [attr.name]: '' }))} className="absolute right-2 top-1.5 text-slate-300 hover:text-red-500"><X size={12} /></button>
                        )}
                    </div>
                ))}


                <div className="flex gap-2 ml-auto items-center">
                    <InventorySettingsDialog organizationId={orgId} slug={slug} initialSettings={settings} />
                    {canEdit && (
                        <Button variant="ghost" onClick={() => setIsCategoryDialogOpen(true)} className="bg-white border border-slate-200 text-slate-600 font-bold uppercase text-[10px] h-8 px-4 rounded-xl shadow-sm hover:bg-slate-50">
                            <FolderPlus size={14} className="mr-2" /> Rubros
                        </Button>
                    )}
                    {barcodeSettings?.enabled && (
                        <Button variant="ghost" onClick={() => window.location.href = `/${slug}/inventory/labels`} className="bg-white border border-slate-200 text-slate-600 font-bold uppercase text-[10px] h-8 px-4 rounded-xl shadow-sm hover:bg-slate-50">
                            <Printer size={14} className="mr-2" /> ETIQUETAS
                        </Button>
                    )}
                </div>
            </div>
            {/* BARRA DE FILTROS DINÁMICOS (SI EXISTEN ATRIBUTOS) */}
            {
                (Object.values(attributeFilters).some(v => v)) && (
                    <div className="flex flex-wrap gap-2 items-center bg-slate-50/50 p-2 rounded-2xl border border-slate-100 mb-4 animate-in fade-in slide-in-from-top-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 pl-2">Filtros Activos:</span>
                        {/* The customAttributesConfig filters were moved above, this block now only handles the clear button */}
                        {(Object.values(attributeFilters).some(v => v)) && (
                            <Button variant="ghost" size="sm" onClick={() => setAttributeFilters({})} className="h-8 text-[9px] font-black text-red-500 hover:bg-red-50 uppercase">
                                Limpiar
                            </Button>
                        )}
                    </div>
                )
            }

            {/* TABLA PRINCIPAL */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/80 h-10">
                        <TableRow className="text-[10px] uppercase font-black border-slate-200 hover:bg-transparent">
                            <TableHead className="w-12 text-center">
                                {canDelete && (
                                    <Checkbox checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0} onCheckedChange={toggleAllSelection} />
                                )}
                            </TableHead>
                            {!settings?.disabled_tabs?.includes('images') && <TableHead className="w-14">FOTO</TableHead>}
                            <TableHead>PRODUCTO</TableHead>
                            <TableHead>PROVEEDOR</TableHead>
                            <TableHead>RUBRO</TableHead>
                            <TableHead>CÓDIGO/SKU</TableHead>
                            <TableHead className="text-right">PRECIO</TableHead>
                            <TableHead className="text-center">REGISTRO</TableHead>
                            <TableHead className="text-center w-14">WEB</TableHead>
                            <TableHead className="text-center w-16">SINC.</TableHead>
                            <TableHead className="text-right">{branchFilter === 'ALL' ? 'STOCK TOTAL' : 'STOCK SUCURSAL'}</TableHead>
                            <TableHead className="text-right px-6">ACCIONES</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingProducts ? (
                            <TableRow>
                                <TableCell colSpan={11} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="animate-spin text-primary" size={24} />
                                        <p className="text-xs text-slate-500 font-bold uppercase">Cargando productos...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="h-48 text-center">
                                    <p className="text-xs text-slate-500 font-bold uppercase">No se encontraron productos.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map((p: any, pIdx: number) => {
                                // Find specific price for the selected list
                                const priceData = Array.isArray(p.pricing)
                                    ? p.pricing.find((item: any) => item.list_id === selectedListId || item.list_id?._id === selectedListId)
                                    : p.pricing?.[selectedListId];

                                let val = priceData ? (priceData.price !== undefined ? priceData.price : priceData.finalPrice) : null;

                                // FALLBACK: If value is null, undefined or 0 AND the selected list is "PRINCIPAL" (case insensitive), show base price.
                                const currentList = uniquePriceLists.find(l => l.id === selectedListId);
                                const isPrincipalList = currentList?.name?.toUpperCase().includes('PRINCIPAL');

                                if ((val === null || val === undefined || val === 0) && isPrincipalList) {
                                    val = p.price;
                                }

                                const priceToShow = val !== null && val !== undefined ? `$ ${val.toLocaleString('es-AR')}` : '-';

                                // CALCULATE STOCK TO SHOW BASED ON FILTER
                                let displayStock = 0;
                                if (branchFilter === 'ALL') {
                                    displayStock = p.variants?.reduce((acc: number, v: any) => acc + (parseInt(v.stock) || 0), 0) || (p.stock || 0);
                                } else {
                                    if (p.variants && p.variants.length > 0) {
                                        displayStock = p.variants.reduce((acc: number, v: any) => acc + (parseInt(v.branch_stocks?.[branchFilter] || 0) || 0), 0);
                                    } else {
                                        displayStock = parseInt(p.branch_stocks?.[branchFilter] || 0) || 0;
                                    }
                                }
                                const isExpanded = expandedRows.has(p.id);
                                return (
                                    <React.Fragment key={`p-${p.id || p._id || pIdx}-${pIdx}`}>
                                        <TableRow className={cn("border-slate-100 h-16 hover:bg-slate-50 transition-colors cursor-pointer", expandedRows.has(p.id) && "bg-slate-50/80")} onClick={() => toggleRowExpansion(p.id)}>
                                            <TableCell className="text-center p-4">
                                                {canDelete && (
                                                    <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleRowSelection(p.id)} onClick={(e) => e.stopPropagation()} />
                                                )}
                                            </TableCell>
                                            {!settings?.disabled_tabs?.includes('images') && (
                                                <TableCell className="p-4"><div className="w-10 h-10 relative rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">{p.image_url ? <Image src={p.image_url} alt="" fill className="object-cover" /> : <ImageOff size={16} className="text-slate-300" />}</div></TableCell>
                                            )}
                                            <TableCell className="p-4 font-black text-slate-800 text-xs uppercase">
                                                {p.name}
                                                {p.manages_lots && (
                                                    <Badge className="ml-2 bg-amber-50 text-amber-600 border border-amber-100/50 text-[8px] font-black uppercase px-1 h-4">LOTES</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="p-4 text-[10px] font-bold text-slate-400 uppercase">{getSupplierName(p.supplier_id)}</TableCell>
                                            <TableCell className="p-4 truncate max-w-[120px]"><Badge variant="secondary" className="text-[8px] uppercase font-black bg-slate-100 text-slate-500 border-none">{getRubroNames(p.category_ids)}</Badge></TableCell>
                                            <TableCell className="p-4 text-[10px] font-mono">{p.sku || '-'}</TableCell>
                                            <TableCell className="p-4 text-right font-black text-xs text-blue-600">{priceToShow}</TableCell>
                                            <TableCell className="p-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    {(() => {
                                                        const created = new Date(p.created_at);
                                                        const updated = p.updated_at ? new Date(p.updated_at) : created;
                                                        // Check if updated is significantly different from created (e.g. > 1 min)
                                                        const isUpdated = Math.abs(updated.getTime() - created.getTime()) > 60000;

                                                        return (
                                                            <>
                                                                <span className={cn("text-[10px] uppercase font-black", isUpdated ? "text-slate-700" : "text-slate-300")}>
                                                                    {isUpdated ? formatFecha(p.updated_at) : '-'}
                                                                </span>
                                                                <span className="text-[9px] font-bold text-slate-400">
                                                                    {formatFecha(p.created_at)}
                                                                </span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-4 text-center"><Switch checked={p.is_visible} onCheckedChange={() => handleToggleVisibility(p.id, p.is_visible)} onClick={(e) => e.stopPropagation()} disabled={!canEdit} /></TableCell>
                                            <TableCell className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {p.external_ids?.tiendanube && (
                                                        <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100" title="Tienda Nube">
                                                            <Cloud size={10} strokeWidth={3} />
                                                        </div>
                                                    )}
                                                    {p.external_ids?.wix && (
                                                        <div className="w-5 h-5 rounded-md bg-purple-50 flex items-center justify-center text-purple-500 border border-purple-100" title="Wix">
                                                            <Globe size={10} strokeWidth={3} />
                                                        </div>
                                                    )}
                                                    {!p.external_ids?.tiendanube && !p.external_ids?.wix && (
                                                        <span className="text-[10px] text-slate-200 font-black">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-4 text-right">
                                                <Badge className={cn(
                                                    "font-black text-[10px]",
                                                    displayStock <= 0 ? "bg-red-100 text-red-600 hover:bg-red-200" :
                                                        displayStock <= 5 ? "bg-amber-100 text-amber-600 hover:bg-amber-200" :
                                                            "bg-slate-900 text-white hover:bg-slate-800"
                                                )}>
                                                    {displayStock} U.
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="p-4 text-right space-x-1 px-6">
                                                {canEdit && (
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedProduct(p); setIsDialogOpen(true); }} className="h-8 w-8 hover:bg-white hover:text-primary transition-all shadow-none"><Edit size={16} /></Button>
                                                )}
                                                {canDelete && (
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setProductToDelete(p); setIsDeleteProductOpen(true); }} className="h-8 w-8 text-slate-300 hover:text-destructive shadow-none transition-all"><Trash2 size={16} /></Button>
                                                )}
                                            </TableCell>
                                        </TableRow>

                                        {/* EXPANDIDO: Mantenemos tu desglose de sucursales */}
                                        {expandedRows.has(p.id) && (
                                            <TableRow className="bg-slate-50/50 border-none hover:bg-slate-50/50">
                                                <TableCell colSpan={11} className="p-0 border-t-0">
                                                    <div className="px-12 py-8 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                                                            <Table>
                                                                <TableHeader className="bg-slate-50/60 h-12">
                                                                    <TableRow className="hover:bg-transparent border-slate-100">
                                                                        <TableHead className="py-3 px-6 text-[10px] font-black uppercase text-slate-500">{variantLabels.color}</TableHead>
                                                                        <TableHead className="py-3 px-6 text-[10px] font-black uppercase text-slate-500">{variantLabels.size}</TableHead>
                                                                        {customAttributesConfig?.map((attr: any) => (
                                                                            <TableHead key={attr.name} className="py-3 px-6 text-[10px] font-black uppercase text-slate-500">{attr.name}</TableHead>
                                                                        ))}
                                                                        {uniqueBranches.filter(b => branchFilter === 'ALL' || b.id === branchFilter).map(br => <TableHead key={br.id} className="py-3 px-6 text-center text-[10px] font-black uppercase text-slate-500"><div className="flex flex-col items-center gap-1"><Store size={14} className="text-slate-300" /> {br.name}</div></TableHead>)}
                                                                        <TableHead className="py-3 px-6 text-right text-[10px] font-black uppercase text-slate-500">Subtotal</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {p.variants?.filter((v: any) => {
                                                                        const colorFilter = attributeFilters['AXIS_COLOR'] || '';
                                                                        const sizeFilter = attributeFilters['AXIS_SIZE'] || '';

                                                                        // Custom Attrib Filter Logic (also fix existing filter logic below map if needed, but here we are just filtering the list)
                                                                        // Actually checking if OTHER filters apply to this variant...
                                                                        // For now, relies on the parent filteredProducts logic, this inner filter is likely redundant if not fully implemented, 
                                                                        // but I will keep existing logic and just add the render cells.

                                                                        const matchesColor = !colorFilter || v.color.toLowerCase().includes(colorFilter.toLowerCase());
                                                                        const matchesSize = !sizeFilter || v.size.toLowerCase().includes(sizeFilter.toLowerCase());

                                                                        const matchesCustom = Object.entries(attributeFilters).every(([key, value]) => {
                                                                            if (key === 'AXIS_COLOR' || key === 'AXIS_SIZE' || !value) return true;
                                                                            return v.custom_attributes?.[key]?.toLowerCase().includes(value.toLowerCase());
                                                                        });

                                                                        return matchesColor && matchesSize && matchesCustom;
                                                                    }).map((v: any, vIdx: number) => (
                                                                        <TableRow key={`v-${p.id || p._id}-${v.id || v._id || 'none'}-${vIdx}`} className="border-slate-50 hover:bg-slate-50/30 h-16">
                                                                            <TableCell className="py-3 px-6 flex items-center gap-3">
                                                                                <div className="w-3 h-3 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: v.color_hex }} />
                                                                                <span className="text-xs font-black uppercase text-slate-700">{v.color || 'Único'}</span>
                                                                            </TableCell>
                                                                            <TableCell className="py-3 px-6 text-xs font-black uppercase text-slate-700">
                                                                                {v.size || 'S/T'}
                                                                            </TableCell>
                                                                            {customAttributesConfig?.map((attr: any) => (
                                                                                <TableCell key={attr.name} className="py-3 px-6 text-xs font-bold uppercase text-slate-600">
                                                                                    {v.custom_attributes?.[attr.name] || '-'}
                                                                                </TableCell>
                                                                            ))}
                                                                            {uniqueBranches.filter(b => branchFilter === 'ALL' || b.id === branchFilter).map(br => <TableCell key={br.id} className="py-3 px-6 text-center text-sm font-black text-slate-700">{v.branch_stocks?.[br.id] || 0}</TableCell>)}
                                                                            <TableCell className="py-3 px-6 text-right"><Badge className="bg-slate-900 text-white font-black text-[11px] px-4 py-1.5 rounded-xl">{v.stock || 0} U.</Badge></TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>


            {/* PAGINATION CONTROLS */}
            <div className="flex items-center justify-between p-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Mostrando {(page - 1) * 50 + 1} a {Math.min(page * 50, totalProducts)} de {totalProducts} productos (Página {page} de {totalPages})
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoadingProducts} className="h-8 w-8 p-0 rounded-lg">
                        <ChevronLeft size={14} />
                    </Button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Simple logic to show window of pages around current would be better, but fixed for now
                            // Let's implement dynamic window:
                            let pNum = i + 1;
                            if (totalPages > 5 && page > 3) pNum = page - 2 + i;
                            if (pNum > totalPages) return null;
                            if (pNum < 1) return null;

                            return (
                                <Button
                                    key={pNum}
                                    variant={page === pNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setPage(pNum)}
                                    disabled={isLoadingProducts}
                                    className={cn("h-8 w-8 p-0 rounded-lg text-[10px] font-black", page === pNum ? "bg-slate-900 text-white" : "text-slate-500")}
                                >
                                    {pNum}
                                </Button>
                            );
                        })}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || isLoadingProducts} className="h-8 w-8 p-0 rounded-lg">
                        <ChevronRight size={14} />
                    </Button>
                </div>
            </div>

            {/* MODAL PRODUCTO: ESTANDARIZADO */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="w-[95vw] sm:max-w-5xl bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden h-[95vh] md:h-[90vh] flex flex-col transition-all">
                    <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">
                            {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase">
                            Completa los datos de la ficha técnica del producto.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        {isDialogOpen && (
                            <ProductForm
                                key={selectedProduct?.id || 'new'}
                                initialData={selectedProduct}
                                isEditMode={!!selectedProduct}
                                orgId={orgId}
                                slug={slug}
                                categories={categories}
                                suppliers={suppliers}
                                customAttributesConfig={customAttributesConfig}
                                variantLabels={variantLabels}
                                barcodeSettings={barcodeSettings}
                                onSuccess={handleProductSaved}
                                availableLists={uniquePriceLists}
                                initialBranches={uniqueBranches}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODALES AUXILIARES */}
            <Dialog open={isMassDeleteOpen} onOpenChange={setIsMassDeleteOpen}>
                <DialogContent className="w-[90vw] sm:max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[200]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Eliminar Selección?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-destructive"><Trash2 size={32} /></div>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button variant="outline" onClick={() => setIsMassDeleteOpen(false)} className="rounded-xl h-12 font-bold uppercase text-[10px]">Cancelar</Button>
                            <Button onClick={handleConfirmMassDelete} disabled={isDeleting} className="bg-destructive text-white rounded-xl h-12 font-black uppercase text-[10px]">Eliminar Todo</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteProductOpen} onOpenChange={setIsDeleteProductOpen}>
                <DialogContent className="w-[90vw] sm:max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Eliminar Producto?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-destructive"><AlertTriangle size={32} /></div>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button variant="outline" onClick={() => setIsDeleteProductOpen(false)} className="rounded-xl h-12 font-bold uppercase text-[10px]">Cancelar</Button>
                            <Button onClick={() => handleConfirmDeleteProduct()} disabled={isDeleting} className="bg-destructive text-white rounded-xl h-12 font-black uppercase text-[10px]">Sí, Eliminar</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="w-[95vw] sm:max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]">
                    <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 space-y-1 text-left relative">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                                <Settings2 size={20} className="text-slate-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900">Gestión de Rubros</DialogTitle>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Organiza tu catálogo por categorías</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase leading-none ml-1">Nuevo Rubro</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="NOMBRE DEL CATEGORÍA / RUBRO..."
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value.toUpperCase())}
                                    className="h-11 border-slate-200 font-bold bg-white focus:border-slate-400 shadow-none rounded-xl text-xs"
                                />
                                <Button
                                    onClick={handleAddCategory}
                                    disabled={categoryLoading || !canCreate}
                                    className="bg-slate-900 hover:bg-black text-white px-5 h-11 rounded-xl shadow-lg shadow-slate-900/10 transition-all active:scale-95"
                                >
                                    <Plus size={18} />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-[10px] font-black uppercase text-slate-400">Rubros Existentes</h4>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[8px] font-black uppercase py-0 px-2 rounded-full">{filteredCategories.length}</Badge>
                            </div>

                            <ScrollArea className="h-[300px] pr-4 -mr-4">
                                <div className="space-y-1.5 p-1">
                                    {paginatedCategories.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                                <Settings2 size={24} />
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase">Aún no hay rubros creados</p>
                                        </div>
                                    ) : (
                                        paginatedCategories.map((cat: any) => (
                                            <div key={cat.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-100 group hover:border-slate-300 hover:shadow-sm transition-all duration-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-slate-900 transition-colors" />
                                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{cat.name}</span>
                                                </div>
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setCategoryToDelete(cat); setIsConfirmDeleteOpen(true); }}
                                                        className="h-8 w-8 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>

                            {/* CATEGORY PAGINATION */}
                            {totalCatPages > 1 && (
                                <div className="flex items-center justify-between pt-2 px-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                                        Pág. {categoryPage} de {totalCatPages}
                                    </p>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setCategoryPage(p => Math.max(1, p - 1))}
                                            disabled={categoryPage === 1}
                                            className="h-7 w-7 rounded-lg border-slate-200"
                                        >
                                            <ChevronLeft size={12} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setCategoryPage(p => Math.min(totalCatPages, p + 1))}
                                            disabled={categoryPage === totalCatPages}
                                            className="h-7 w-7 rounded-lg border-slate-200"
                                        >
                                            <ChevronRight size={12} />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                        <Button
                            variant="ghost"
                            onClick={() => setIsCategoryDialogOpen(false)}
                            className="w-full h-11 rounded-xl font-black uppercase text-[10px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                        >
                            Cerrar Panel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
                <DialogContent className="w-[90vw] sm:max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Confirmar Borrado?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-destructive"><AlertTriangle size={32} /></div>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)} className="rounded-xl h-12 font-bold uppercase text-[10px]">Cancelar</Button>
                            <Button onClick={executeDeleteCategory} disabled={isDeleting} className="bg-destructive text-white rounded-xl h-12 font-black uppercase text-[10px]">Sí, Eliminar</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isDuplicateAlertOpen} onOpenChange={setIsDuplicateAlertOpen}>
                <DialogContent className="w-[90vw] sm:max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[200]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">Rubro Repetido</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-600"><AlertTriangle size={32} /></div>
                        <p className="text-slate-500 font-medium text-xs leading-relaxed px-4">
                            Ya existe un rubro registrado con este nombre. <br />
                            Para mantener la integridad de tu inventario, por favor elige un identificador único.
                        </p>
                        <Button onClick={() => setIsDuplicateAlertOpen(false)} className="w-full bg-slate-900 text-white rounded-xl h-14 font-black uppercase text-[10px]">Entendido</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
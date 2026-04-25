'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createProductAction, getPriceListsAction, getBranchesAction, checkSkuAction } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from 'sonner'
import { Save, Loader2, ImageUp, X, RefreshCw, Plus, Search, Calculator, Store, Box, LayoutGrid, Check, AlertCircle, Trash2, ChevronsUpDown, ScanBarcode, Wand2, Calendar, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { stockLotService } from '@/services/stockLotService'

// Utility to compress image
const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 800; // Calidad profesional pero ligera
                const MAX_HEIGHT = 800;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Export as WebP quality 0.8 (Excellent balance)
                resolve(canvas.toDataURL('image/webp', 0.8));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

import { organizationService } from '@/services/organizationService'
import { authService } from '@/services/authService'
import { LimitReachedModal } from '@/components/limit-reached-modal';

export function ProductForm({ initialData, isEditMode, orgId, slug, categories, suppliers, customAttributesConfig, variantLabels = { color: 'Color', size: 'Talle' }, barcodeSettings, onSuccess, availableLists = [], initialBranches = [], settings: initialSettings }: any) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(false)
    const [localSettings, setLocalSettings] = useState<any>(initialSettings || {})

    // DEDUPLICATE INPUT LISTS FOR REACT KEYS SAFETY
    const uniqueSuppliers = useMemo(() => {
        const seen = new Set();
        return (suppliers || []).filter((s: any) => {
            const id = s.id || s._id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [suppliers]);

    const uniqueCategories = useMemo(() => {
        const seen = new Set();
        return (categories || []).filter((c: any) => {
            const id = c.id || c._id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [categories]);

    const uniqueBranches = useMemo(() => {
        const seen = new Set();
        return (initialBranches || []).filter((b: any) => {
            const id = b.id || b._id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [initialBranches]);

    const uniqueLists = useMemo(() => {
        const seen = new Set();
        return (availableLists || []).filter((l: any) => {
            const id = l.id || l._id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [availableLists]);
    const [limitModalOpen, setLimitModalOpen] = useState(false)
    const [limitType, setLimitType] = useState<any>('generic')
    const [imageProcessing, setImageProcessing] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null)
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
    const [lists, setLists] = useState<any[]>(uniqueLists)
    const [branches, setBranches] = useState<any[]>(uniqueBranches)
    const [priceChanged, setPriceChanged] = useState(false)

    // Selectors State
    const [openSupplier, setOpenSupplier] = useState(false)
    const [openRubros, setOpenRubros] = useState(false)

    // SKU Validation
    const [skuError, setSkuError] = useState<string | null>(null)
    const [isCheckingSku, setIsCheckingSku] = useState(false)
    const [showUpdateDateConfirm, setShowUpdateDateConfirm] = useState(false)
    const [showDescription, setShowDescription] = useState(!!initialData?.description)
    const [user, setUser] = useState<any>(null)

    // Check permissions and load settings if missing
    useEffect(() => {
        authService.getMe().then(setUser)

        // Fallback: If settings are missing (i.e. Edit mode from table), fetch them
        if (!initialSettings || Object.keys(initialSettings).length === 0) {
            organizationService.getBySlug(slug).then(org => {
                if (org && org.settings) {
                    setLocalSettings(org.settings);
                }
            });
        }
    }, [initialSettings, slug])

    const isBatchManagementEnabled = useMemo(() => {
        // 1. Check Org Settings (Super Admin)
        const isDisabledInOrg = localSettings?.disabled_tabs?.includes('batch_management')
        if (isDisabledInOrg) return false

        // 2. Check User Role permissions (if user and role specified)
        if (user && user.role && user.role.permissions) {
            const inventoryPerm = user.role.permissions.find((p: any) => p.module === 'inventory')
            if (inventoryPerm && inventoryPerm.tabs) {
                const batchTab = inventoryPerm.tabs.find((t: any) => t.name === 'batch_management')
                if (batchTab && !batchTab.enabled) return false
            }
        }

        return true
    }, [localSettings, user])

    const actionLabel = isEditMode ? 'Actualizar Producto' : 'Guardar Producto'

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        sku: initialData?.sku || '',
        barcode: initialData?.barcode || '',
        supplier_id: (initialData?.supplier_id && typeof initialData.supplier_id === 'object') ? (initialData.supplier_id._id || initialData.supplier_id.id) : (initialData?.supplier_id || ''),
        supplier_product_code: initialData?.supplier_product_code || '',
        description: initialData?.description || '',
        image_url: initialData?.image_url || '',
        is_visible: initialData?.is_visible ?? false,
        manages_lots: initialData?.manages_lots ?? false,
        cost: initialData?.cost || 0, // Global Cost
        category_ids: Array.isArray(initialData?.category_ids)
            ? initialData.category_ids.map((c: any) => (typeof c === 'object' ? (c._id || c.id) : c))
            : [],
        custom_attributes: initialData?.custom_attributes || {},
        variants: initialData?.variants?.map((v: any, idx: number) => ({
            ...v,
            tempId: (v._id || v.id) ? `v-${v._id || v.id}-${idx}` : `v-${idx}-${Date.now()}`,
            color: v.color || '',
            size: v.size || '',
            color_hex: v.color_hex || '#000000',
            image_url: v.image_url || '',
            barcode: v.barcode || '',
            custom_attributes: v.custom_attributes || {},
            branch_stocks: v.branch_stocks || {}
        })) || [],
        branch_stocks: initialData?.branch_stocks || {},
        stock: initialData?.stock || 0,
        lots_data: [] as any[],
        pricing: Array.isArray(initialData?.pricing)
            ? initialData.pricing.reduce((acc: any, curr: any) => {
                const listId = (typeof curr.list_id === 'object' && curr.list_id !== null) ? (curr.list_id._id || curr.list_id.id) : curr.list_id;
                return {
                    ...acc,
                    [listId]: {
                        ...curr,
                        list_id: listId, // Ensure string ID in object too
                        // Robustly initialize both fields to ensure continuity
                        finalPrice: curr.finalPrice ?? curr.price,
                        price: curr.price ?? curr.finalPrice
                    }
                }
            }, {})
            : (initialData?.pricing || {})
    })

    // --- VARIANT MATRIX STATES ---
    const initialMatrixAxisX = 'size' // Horizontal (e.g. Talles)
    const initialMatrixAxisY = 'color' // Vertical (e.g. Colores)
    const [matrixAxisX, setMatrixAxisX] = useState(initialMatrixAxisX)
    const [matrixAxisY, setMatrixAxisY] = useState(initialMatrixAxisY)

    // Group variants for the UI
    const groupedVariants = useMemo(() => {
        const groups: Record<string, any> = {}
        formData.variants.forEach((v: any) => {
            const yValue = v[matrixAxisY] || (v.custom_attributes?.[matrixAxisY]) || 'ÚNICO'
            if (!groups[yValue]) {
                groups[yValue] = {
                    key: yValue,
                    color_hex: v.color_hex || '#000000',
                    items: []
                }
            }
            groups[yValue].items.push(v)
        })
        return Object.values(groups)
    }, [formData.variants, matrixAxisY])

    const allPossibleAttributes = useMemo(() => {
        const base = [
            { id: 'color', name: variantLabels.color },
            { id: 'size', name: variantLabels.size }
        ]
        const customs = (customAttributesConfig || []).map((a: any) => ({
            id: a.name,
            name: a.name
        }))
        const combined = [...base, ...customs]
        const seen = new Set()
        return combined.filter(a => {
            if (!a.id || seen.has(a.id)) return false
            seen.add(a.id)
            return true
        })
    }, [variantLabels, customAttributesConfig])
    const [lots, setLots] = useState<any[]>([])
    const [loadingLots, setLoadingLots] = useState(false)
    const [isAddingLot, setIsAddingLot] = useState(false)
    const [newLotItem, setNewLotItem] = useState({
        lot_number: '',
        expiration_date: '',
        stock: 0,
        branch_id: branches[0]?.id || ''
    })

    // Fetch if missing (fallback)
    useEffect(() => {
        if (lists.length === 0) getPriceListsAction(orgId).then(res => { if (res.success) setLists(res.data || []) })
        if (branches.length === 0) getBranchesAction(orgId).then(res => { if (res.success) setBranches(res.data || []) })

        if (isEditMode && initialData?.id) {
            setLoadingLots(true);
            stockLotService.getAll(orgId, { product_id: initialData.id })
                .then(res => {
                    const fetchedLots = res.data || [];
                    setLots(fetchedLots);

                    // AGRUPAR LOTES POR NÚMERO, VENCIMIENTO Y VARIANTE (para la UI estilo variantes)
                    const grouped: any = {};
                    fetchedLots.forEach((l: any) => {
                        const dateStr = l.expiration_date ? new Date(l.expiration_date).toISOString().split('T')[0] : '';
                        const vId = l.variant_id || 'base';
                        const key = `${l.lot_number}-${dateStr}-${vId}`;
                        if (!grouped[key]) {
                            grouped[key] = {
                                lot_number: l.lot_number,
                                expiration_date: dateStr,
                                variant_id: vId === 'base' ? null : vId,
                                branch_stocks: {}
                            };
                        }
                        const bId = (typeof l.branch_id === 'object' && l.branch_id !== null) ? (l.branch_id._id || l.branch_id.id) : l.branch_id;
                        grouped[key].branch_stocks[bId] = l.stock;
                    });

                    // Aseguramos que los lotes se vinculen a los tempId de las variantes
                    const lotsWithVLinks = Object.values(grouped).map((lot: any) => {
                        if (lot.variant_id) return lot;
                        return lot;
                    });

                    setFormData(prev => ({ ...prev, lots_data: lotsWithVLinks }));
                })
                .finally(() => setLoadingLots(false));
        }
    }, [orgId, lists.length, branches.length, initialData?.id, isEditMode])

    const handleAddLotDirectly = async () => {
        // Esta función se mantiene para compatibilidad si se usa el botón rápido, 
        // pero ahora preferiremos la gestión en la lista.
    };

    const handleAddLotRow = (vId: any = null) => {
        setFormData(p => ({
            ...p,
            lots_data: [
                ...p.lots_data,
                { lot_number: '', expiration_date: '', variant_id: vId, branch_stocks: {} }
            ]
        }))
    }

    const updateLotRow = (index: number, field: string, value: any) => {
        const newLots = [...formData.lots_data];
        newLots[index] = { ...newLots[index], [field]: value };
        setFormData(p => ({ ...p, lots_data: newLots }));
    }

    const handleLotBranchStockChange = (lotIndex: number, branchId: string, value: string) => {
        const val = parseInt(value) || 0;

        setFormData(p => {
            const newLots = [...p.lots_data];
            newLots[lotIndex].branch_stocks = {
                ...newLots[lotIndex].branch_stocks,
                [branchId]: val
            };

            const targetVId = newLots[lotIndex].variant_id;

            if (targetVId) {
                // Sincronizar con la variante específica
                const newVariants = p.variants.map((v: any) => {
                    if (v.tempId === targetVId) {
                        const vLots = newLots.filter((l: any) => l.variant_id === targetVId);
                        const vBranchStocks: any = {};
                        vLots.forEach((l: any) => {
                            Object.keys(l.branch_stocks).forEach(bId => {
                                vBranchStocks[bId] = (vBranchStocks[bId] || 0) + l.branch_stocks[bId];
                            });
                        });
                        const totalStock = Object.values(vBranchStocks).reduce((a: any, b: any) => a + Number(b), 0);
                        return { ...v, branch_stocks: vBranchStocks, stock: totalStock };
                    }
                    return v;
                });
                return { ...p, lots_data: newLots, variants: newVariants };
            } else if (p.variants.length === 0) {
                // Sincronizar con stock global si no hay variantes
                const baseLots = newLots.filter((l: any) => !l.variant_id);
                const baseBranchStocks: any = {};
                baseLots.forEach((l: any) => {
                    Object.keys(l.branch_stocks).forEach(bId => {
                        baseBranchStocks[bId] = (baseBranchStocks[bId] || 0) + l.branch_stocks[bId];
                    });
                });
                const totalStock = Object.values(baseBranchStocks).reduce((a: any, b: any) => a + Number(b), 0);
                return { ...p, lots_data: newLots, branch_stocks: baseBranchStocks, stock: totalStock };
            }

            return { ...p, lots_data: newLots };
        });
    }

    const handleBranchStockChange = (vIndex: number, branchId: string, value: string) => {
        const newVariants = [...formData.variants]
        const val = parseInt(value) || 0
        newVariants[vIndex].branch_stocks = { ...newVariants[vIndex].branch_stocks, [branchId]: val }
        newVariants[vIndex].stock = Object.values(newVariants[vIndex].branch_stocks).reduce((a: any, b: any) => a + b, 0)
        setFormData(p => ({ ...p, variants: newVariants }))
    }

    const addVariantGroup = () => {
        const defaultValue = matrixAxisY === 'color' ? 'NUEVO COLOR' : 'NUEVO GRUPO'
        const tempId = `v-new-${Date.now()}`
        const newVariant = {
            tempId,
            [matrixAxisY]: defaultValue,
            [matrixAxisX]: '',
            color_hex: matrixAxisY === 'color' ? '#4f46e5' : '#000000',
            stock: 0,
            barcode: '',
            custom_attributes: {},
            branch_stocks: {}
        }
        setFormData(p => ({ ...p, variants: [...p.variants, newVariant] }))
    }

    const addSubVariant = (parentKey: string) => {
        const tempId = `v-sub-${Date.now()}`
        const base = formData.variants.find((v: any) => {
            const yVal = v[matrixAxisY] || (v.custom_attributes?.[matrixAxisY])
            return yVal === parentKey
        })

        // IMPORTANT: Destructure to EXCLUDE existing DB IDs (id, _id) from the new variant
        const { id, _id, ...rest } = base || {};

        const newSub = {
            ...rest,
            tempId,
            [matrixAxisX]: '',
            stock: 0,
            barcode: '',
            branch_stocks: {}
        }

        const isCustomX = !['color', 'size'].includes(matrixAxisX)
        if (isCustomX) {
            newSub.custom_attributes = { ...newSub.custom_attributes, [matrixAxisX]: '' }
        }

        setFormData(p => ({ ...p, variants: [...p.variants, newSub] }))
    }

    const validateSku = async (sku: string) => {
        if (!sku) { setSkuError(null); return; }
        if (isEditMode && initialData?.sku === sku) { setSkuError(null); return; }
        setIsCheckingSku(true)
        try {
            const res = await checkSkuAction(orgId, sku)
            if (res.exists) setSkuError("Ya existe")
            else setSkuError(null)
        } catch (err) {
            console.error("Error checking SKU:", err)
        } finally {
            setIsCheckingSku(false)
        }
    }

    // SKU Debounce Effect
    useEffect(() => {
        if (!formData.sku) {
            setSkuError(null)
            return
        }

        const timer = setTimeout(() => {
            validateSku(formData.sku)
        }, 500)

        return () => clearTimeout(timer)
    }, [formData.sku])

    const handleMainCostChange = (val: string) => {
        const newCost = parseFloat(val) || 0;
        setFormData(prev => {
            const newPricing: any = { ...prev.pricing };
            // Update all lists with new Cost and recalculate
            Object.keys(newPricing).forEach(listId => {
                const item = { ...newPricing[listId] };
                item.cost = newCost;

                const uVal = parseFloat(item.utilityValue) || 0;
                const utType = item.utilityType || 'percentage';

                // Recalc Final Price
                let res = utType === 'fixed' ? newCost + uVal : newCost + (newCost * (uVal / 100));
                item.finalPrice = res.toFixed(2);
                newPricing[listId] = item;
            });

            return { ...prev, cost: newCost, pricing: newPricing };
        });
    };

    const handlePriceCalc = (listId: string, field: string, value: string) => {
        setPriceChanged(true);
        setFormData(prev => {
            const currentList = prev.pricing[listId] || {
                cost: prev.cost, // Use Global Cost default
                utilityValue: 0, utilityType: 'percentage', finalPrice: 0,
                name: lists.find(l => l.id === listId)?.name || 'LISTA'
            };

            // Copy first, then normalize
            let updated = { ...currentList, [field]: value, list_id: listId }

            // Normalize: If finalPrice is missing but price exists, use it.
            if (updated.finalPrice === undefined && updated.price !== undefined) {
                updated.finalPrice = updated.price;
            }
            const cost = prev.cost; // Always use Global Cost
            let uVal = parseFloat(updated.utilityValue); if (isNaN(uVal)) uVal = 0;
            let fPrice = parseFloat(updated.finalPrice); if (isNaN(fPrice)) fPrice = 0;
            const utilityType = updated.utilityType;

            if (field === 'utilityValue' || field === 'utilityType') {
                let res = utilityType === 'fixed' ? cost + uVal : cost + (cost * (uVal / 100));
                updated.finalPrice = res.toFixed(2);
            } else if (field === 'finalPrice') {
                if (cost > 0) updated.utilityValue = utilityType === 'fixed' ? (fPrice - cost).toFixed(2) : (((fPrice / cost) - 1) * 100).toFixed(2);
                else if (utilityType === 'fixed') updated.utilityValue = fPrice.toFixed(2);
            }
            return { ...prev, pricing: { ...prev.pricing, [listId]: updated } }
        })
    }

    const generateBarcode = () => {
        const format = barcodeSettings?.defaultFormat || 'CODE128';
        let newCode = '';
        if (format === 'EAN13') {
            newCode = '779' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
            // Calculate Check Digit
            let sum = 0;
            for (let i = 0; i < 12; i++) {
                sum += parseInt(newCode[i]) * (i % 2 === 0 ? 1 : 3);
            }
            const check = (10 - (sum % 10)) % 10;
            newCode += check;
        } else {
            // Random 12 chars for Code128 or other
            const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            for (let i = 0; i < 12; i++) newCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(p => ({ ...p, barcode: newCode }));
        toast.success(`Código generado (${format}): ${newCode}`);
    };

    const generateVariantBarcode = (idx: number) => {
        const format = barcodeSettings?.defaultFormat || 'CODE128';
        let newCode = '';
        if (format === 'EAN13') {
            newCode = '779' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
            let sum = 0;
            for (let i = 0; i < 12; i++) { sum += parseInt(newCode[i]) * (i % 2 === 0 ? 1 : 3); }
            const check = (10 - (sum % 10)) % 10;
            newCode += check;
        } else {
            const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            for (let i = 0; i < 12; i++) newCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const newVariants = [...formData.variants]
        newVariants[idx] = { ...newVariants[idx], barcode: newCode }
        setFormData(p => ({ ...p, variants: newVariants }))
        toast.success(`Código de variante generado: ${newCode}`);
    };

    const executeSubmit = async (updateTimestamp: boolean = true) => {
        setLoading(true)
        setShowUpdateDateConfirm(false)
        try {
            const submitData = new FormData()
            if (isEditMode) submitData.append('id', initialData.id)
            submitData.append('name', formData.name); submitData.append('sku', formData.sku)
            submitData.append('barcode', formData.barcode || '')
            submitData.append('cost', formData.cost.toString()) // Append cost
            submitData.append('supplier_id', formData.supplier_id); submitData.append('description', formData.description)
            submitData.append('supplier_product_code', formData.supplier_product_code)
            submitData.append('image_url', formData.image_url); submitData.append('is_visible', formData.is_visible.toString())
            submitData.append('manages_lots', formData.manages_lots.toString())
            submitData.append('category_ids', JSON.stringify(formData.category_ids))
            submitData.append('variants', JSON.stringify(formData.variants))
            // Sincronizar precio raíz con la lista PRINCIPAL para consistencia en DB
            const mainList = lists.find((l: any) => l.name === 'PRINCIPAL' || l.is_default);
            const pData = mainList ? formData.pricing[mainList.id] : null;
            const principalPrice = pData ? (pData.finalPrice ?? pData.price) : (initialData?.price || 0);

            submitData.append('price', (principalPrice || 0).toString())
            submitData.append('pricing', JSON.stringify(formData.pricing))
            submitData.append('price_changed', priceChanged.toString())
            submitData.append('custom_attributes', JSON.stringify(formData.custom_attributes))
            submitData.append('stock', formData.stock.toString())
            submitData.append('branch_stocks', JSON.stringify(formData.branch_stocks))
            submitData.append('update_timestamp', updateTimestamp.toString()) // Flag for backend

            // Lotes (Nuevo Flow distribuido)
            if (formData.manages_lots && formData.lots_data.length > 0) {
                submitData.append('lots_data', JSON.stringify(formData.lots_data))
            }

            const result = await createProductAction(orgId, slug, submitData)
            if (result?.error) {
                if (result.error.includes('LIMIT_REACHED')) {
                    setLimitType('products')
                    setLimitModalOpen(true)
                } else {
                    toast.error(result.error)
                }
            } else { toast.success("Producto guardado"); onSuccess(result.data) }
        } catch (err) { toast.error("Error de conexión") } finally { setLoading(false) }
    }

    const handleSubmit = () => {
        if (!formData.name.trim()) return toast.error("El nombre es obligatorio")
        if (skuError) return toast.error("El SKU no es válido o ya existe")

        if (isEditMode) {
            setShowUpdateDateConfirm(true)
        } else {
            executeSubmit(true)
        }
    }

    return (
        <>
            <LimitReachedModal isOpen={limitModalOpen} onClose={() => setLimitModalOpen(false)} limitType={limitType} />
            <div className="flex flex-col h-full bg-white text-slate-900 w-full overflow-hidden font-sans">
                <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white z-10">
                    <h2 className="text-sm font-black uppercase tracking-wide text-slate-400">Ficha de Producto</h2>
                    <Button onClick={handleSubmit} disabled={loading || imageProcessing} size="sm" className="bg-slate-900 hover:bg-black text-white h-9 px-6 rounded-full font-bold uppercase text-[10px] shadow-lg transition-all active:scale-95 flex items-center gap-2">
                        {loading ? <Loader2 className="animate-spin h-3 w-3" /> : <Save size={14} />} {isEditMode ? 'Actualizar' : 'Guardar'}
                    </Button>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-6 space-y-6 w-full pb-20">

                        {/* BLOQUE 1: DATOS BÁSICOS */}
                        <div className="p-6 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-6 items-start shadow-sm bg-slate-50/30">
                            <div className="md:col-span-2 flex justify-center md:justify-start">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative w-32 h-32 rounded-2xl bg-white border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all shadow-sm group"
                                >
                                    {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <ImageUp size={24} className="text-slate-300 group-hover:text-blue-500 transition-colors" />}
                                    {imageProcessing && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}
                                    {imagePreview && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setImagePreview(null);
                                                setFormData(p => ({ ...p, image_url: '' }));
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                            className="absolute top-1 right-1 bg-white/90 text-slate-400 hover:text-red-500 rounded-full p-1 shadow-sm border border-slate-100 transition-colors z-20"
                                            title="Eliminar imagen"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]; if (!file) return;
                                            setImageProcessing(true);
                                            try {
                                                const compressedBase64 = await compressImage(file);
                                                setImagePreview(compressedBase64);
                                                setFormData(p => ({ ...p, image_url: compressedBase64 }));
                                                toast.success("Imagen optimizada");
                                            } catch (err) {
                                                toast.error("Error al procesar imagen");
                                            } finally {
                                                setImageProcessing(false);
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-10 grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* SKU */}
                                <div className="space-y-2 relative">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">SKU</Label>
                                    <div className="relative">
                                        <Input
                                            value={formData.sku}
                                            onChange={(e) => {
                                                const val = e.target.value.toUpperCase();
                                                setFormData(p => ({ ...p, sku: val }));
                                                if (skuError) setSkuError(null);
                                            }}
                                            className={cn("h-10 rounded-xl font-mono text-center font-bold border-slate-200 bg-white pr-8", skuError && "border-red-500 bg-red-50")}
                                            placeholder="REF-000"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {isCheckingSku && <Loader2 size={14} className="animate-spin text-slate-400" />}
                                            {!isCheckingSku && skuError && <AlertCircle size={16} className="text-red-500" />}
                                            {!isCheckingSku && !skuError && formData.sku && <Check size={16} className="text-green-500" />}
                                        </div>
                                    </div>
                                    {skuError && <p className="text-[9px] font-black text-red-500 absolute -bottom-4 left-1">{skuError}</p>}
                                </div>

                                {/* BARCODE */}
                                {barcodeSettings?.enabled && (
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Código de Barras</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={formData.barcode}
                                                onChange={(e) => setFormData(p => ({ ...p, barcode: e.target.value }))}
                                                className="h-10 rounded-xl font-mono text-center font-bold border-slate-200 bg-white"
                                                placeholder="Escanear o Generar"
                                            />
                                            <Button type="button" variant="outline" size="icon" onClick={generateBarcode} className="h-10 w-10 shrink-0 rounded-xl border-slate-200" title="Generar Automáticamente">
                                                <Wand2 size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* NAME */}
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Descripción del Producto</Label>
                                    <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="h-10 rounded-xl font-bold uppercase border-slate-200 focus:border-blue-500 bg-white" placeholder="EJ: REMERA OVERSIZE" />
                                </div>

                                {/* FLEX ROW: Price, Supplier, Rubros */}
                                <div className="md:col-span-4 flex flex-col md:flex-row gap-4 items-start">
                                    {/* PRICE (Narrower) */}
                                    <div className="space-y-2 w-full md:w-[140px] shrink-0">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Precio Venta</Label>
                                        <div onClick={() => setIsPricingModalOpen(true)} className="flex items-center justify-between px-3 h-10 w-full bg-blue-50/50 border border-blue-100 rounded-xl text-blue-600 hover:border-blue-500 cursor-pointer transition-all">
                                            <span className="text-sm font-black truncate text-right w-full">$ {(() => {
                                                const mainList = lists.find(l => l.name === 'PRINCIPAL' || l.is_default);
                                                const pData = mainList ? formData.pricing[mainList.id] : null;
                                                const price = pData ? (pData.finalPrice ?? pData.price) : null;

                                                if (price) return price;

                                                // Fallback search
                                                const found = (Object.values(formData.pricing) as any[]).find((p: any) => p.name === 'PRINCIPAL');
                                                return found ? (found.finalPrice ?? found.price) : "0";
                                            })()}</span>
                                            <Calculator size={14} className="text-blue-400 shrink-0 ml-1" />
                                        </div>
                                    </div>

                                    {/* PROVEEDOR (Standard) */}
                                    <div className="space-y-2 w-full md:w-[220px] shrink-0">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Proveedor</Label>
                                        <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                                            <PopoverTrigger asChild>
                                                <Button role="combobox" aria-expanded={openSupplier} variant="outline" className="w-full h-10 justify-between rounded-xl border-slate-200 bg-white text-xs font-bold uppercase px-3 shadow-none overflow-hidden text-slate-700">
                                                    <span className={cn("truncate", formData.supplier_id && "text-blue-600")}>{formData.supplier_id ? suppliers.find((s: any) => s.id === formData.supplier_id)?.name || "Seleccionado" : "Seleccionar"}</span>
                                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[200px] p-0 rounded-xl shadow-xl border-slate-100">
                                                <Command>
                                                    <CommandInput placeholder="Buscar..." className="h-9 text-xs font-bold" />
                                                    <CommandList>
                                                        <CommandEmpty>No encontrado.</CommandEmpty>
                                                        <CommandGroup>
                                                            {uniqueSuppliers.map((s: any) => {
                                                                const isSelected = formData.supplier_id === s.id;
                                                                return (
                                                                    <CommandItem key={s.id} value={s.name} onSelect={() => { setFormData(p => ({ ...p, supplier_id: s.id })); setOpenSupplier(false); }} className="text-xs font-medium uppercase aria-selected:bg-blue-50">
                                                                        <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}><Check className={cn("h-4 w-4", isSelected ? "visible" : "invisible")} /></div>
                                                                        {s.name}
                                                                    </CommandItem>
                                                                )
                                                            })}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* RUBROS (Fills Rest, Badges Internal) */}
                                    <div className="space-y-2 flex-1 w-full min-w-0">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Rubros</Label>
                                        <Popover open={openRubros} onOpenChange={setOpenRubros}>
                                            <PopoverTrigger asChild>
                                                <Button role="combobox" aria-expanded={openRubros} variant="outline" className="w-full min-h-10 h-auto justify-between rounded-xl border-slate-200 bg-white text-xs font-bold uppercase px-3 py-2 shadow-none text-slate-700 hover:bg-slate-50">
                                                    <div className="flex flex-wrap gap-1 w-full items-center">
                                                        {formData.category_ids.length > 0 ? (
                                                            Array.from(new Set(formData.category_ids)).map((id: any) => {
                                                                const cat = categories.find((c: any) => c.id === id); if (!cat) return null;
                                                                return (
                                                                    <Badge key={id} variant="secondary" className="px-2 py-0 text-[10px] font-black uppercase bg-blue-50 text-blue-700 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors border border-blue-100/50" onClick={(e) => { e.stopPropagation(); setFormData(p => ({ ...p, category_ids: p.category_ids.filter((cid: any) => cid !== id) })); }}>
                                                                        {cat.name} <X size={10} className="ml-1" />
                                                                    </Badge>
                                                                )
                                                            })
                                                        ) : (
                                                            <span className="text-slate-400 font-medium">Seleccionar rubros...</span>
                                                        )}
                                                    </div>
                                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0 rounded-xl shadow-xl border-slate-100" align="end">
                                                <Command>
                                                    <CommandInput placeholder="Buscar..." className="h-9 text-xs font-bold" />
                                                    <CommandList>
                                                        <CommandEmpty>No encontrado.</CommandEmpty>
                                                        <CommandGroup>
                                                            {uniqueCategories.map((cat: any) => {
                                                                const isSelected = formData.category_ids.includes(cat.id);
                                                                return (
                                                                    <CommandItem key={cat.id} value={cat.name} onSelect={() => { setFormData(p => ({ ...p, category_ids: isSelected ? p.category_ids.filter((id: any) => id !== cat.id) : [...p.category_ids, cat.id] })); }} className="text-xs font-medium uppercase aria-selected:bg-blue-50">
                                                                        <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}><Check className={cn("h-4 w-4", isSelected ? "visible" : "invisible")} /></div>
                                                                        {cat.name}
                                                                    </CommandItem>
                                                                )
                                                            })}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* FLEX ROW: Supplier Code, Web */}
                                <div className="md:col-span-4 flex gap-4 items-end">
                                    {/* SUPPLIER PRODUCT CODE */}
                                    <div className="space-y-2 w-full md:w-[200px]">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">C. Prov. Interno</Label>
                                        <Input
                                            value={formData.supplier_product_code}
                                            onChange={(e) => setFormData(p => ({ ...p, supplier_product_code: e.target.value.toUpperCase() }))}
                                            className="h-10 rounded-xl font-bold uppercase border-slate-200 bg-white text-xs"
                                            placeholder="EJ: REF-123"
                                        />
                                    </div>

                                    {/* WEB */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 h-10 bg-white rounded-xl border border-slate-200 px-4">
                                            <Label className="text-[10px] font-bold uppercase text-slate-500 cursor-pointer" onClick={() => setFormData(p => ({ ...p, is_visible: !p.is_visible }))}>Web</Label>
                                            <Switch checked={formData.is_visible} onCheckedChange={(v) => setFormData(p => ({ ...p, is_visible: v }))} className="scale-75 origin-center" />
                                        </div>
                                    </div>

                                    {/* LOTES */}
                                    {isBatchManagementEnabled && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3 h-10 bg-amber-50/50 rounded-xl border border-amber-100 px-4 group hover:bg-amber-100/50 transition-all">
                                                <Label className="text-[10px] font-black uppercase text-amber-600 cursor-pointer" onClick={() => setFormData(p => ({ ...p, manages_lots: !p.manages_lots }))}>Lotes</Label>
                                                <Switch checked={formData.manages_lots} onCheckedChange={(v) => setFormData(p => ({ ...p, manages_lots: v }))} className="scale-75 origin-center data-[state=checked]:bg-amber-600" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {formData.manages_lots && (
                                    <div className="md:col-span-4 mt-2">
                                        <div className="bg-amber-50/20 rounded-2xl border border-amber-100/50 p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-amber-600 flex items-center justify-center text-white shadow-sm">
                                                    <Calendar size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-amber-600 uppercase">Gestión de Lotes Activa</p>
                                                    <p className="text-[9px] text-slate-500 font-medium">Carga lotes directamente dentro de cada variante.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>



                        {/* OBS Panel */}
                        <div className="md:col-span-4 space-y-2 pt-2 border-t border-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Observaciones</Label>
                                    {!showDescription && !formData.description && <button onClick={() => setShowDescription(true)} className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded-full hover:bg-blue-50"><Plus size={14} strokeWidth={3} /></button>}
                                </div>
                                {(showDescription || formData.description) && <button onClick={() => { setFormData(p => ({ ...p, description: '' })); setShowDescription(false); }} className="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar"><Trash2 size={14} /></button>}
                            </div>
                            {(showDescription || formData.description) && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} className="w-full min-h-[80px] rounded-lg border border-slate-200 p-3 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 transition-all resize-y bg-white shadow-sm" placeholder="Información adicional..." />
                                </div>
                            )}
                        </div>

                        {/* Custom Attrs Placeholder */}

                        {/* BLOQUE DE STOCK / LOTES PARA PRODUCTO BASE (SIN VARIANTES) */}
                        {formData.variants.length === 0 && (
                            <div className="md:col-span-12 mt-4 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="space-y-1">
                                        <h3 className="text-slate-800 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                                            <Package size={20} className="text-blue-500" /> Inventario General
                                        </h3>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Control de stock para el producto base</p>
                                    </div>

                                    {formData.manages_lots && (
                                        <Button
                                            type="button"
                                            onClick={() => handleAddLotRow(null)}
                                            className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-black uppercase px-4 rounded-xl shadow-sm"
                                        >
                                            <Plus size={14} className="mr-2" /> Nuevo Lote
                                        </Button>
                                    )}
                                </div>

                                {formData.manages_lots ? (
                                    /* LOTES PARA PRODUCTO BASE */
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {formData.lots_data
                                            .map((lot, originalIdx) => ({ lot, originalIdx }))
                                            .filter(item => !item.lot.variant_id)
                                            .map(({ lot, originalIdx }) => (
                                                <div key={originalIdx} className="bg-amber-50/30 p-4 rounded-2xl border border-amber-100 relative group">
                                                    <div className="flex gap-4 mb-4">
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-[8px] font-black text-amber-600 uppercase">N° Lote</Label>
                                                            <Input
                                                                value={lot.lot_number}
                                                                onChange={(e) => updateLotRow(originalIdx, 'lot_number', e.target.value.toUpperCase())}
                                                                className="h-8 text-[10px] font-bold bg-white border-amber-100"
                                                                placeholder="L-100"
                                                            />
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-[8px] font-black text-amber-600 uppercase">Vencimiento</Label>
                                                            <Input
                                                                type="date"
                                                                value={lot.expiration_date}
                                                                onChange={(e) => updateLotRow(originalIdx, 'expiration_date', e.target.value)}
                                                                className="h-8 text-[10px] font-bold bg-white border-amber-100"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {branches.map(branch => (
                                                            <div key={branch.id} className="bg-white/50 p-2 rounded-xl border border-slate-100 shadow-sm">
                                                                <Label className="text-[7px] font-black text-slate-400 uppercase truncate block mb-1">{branch.name}</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={lot.branch_stocks[branch.id] || ''}
                                                                    onChange={(e) => handleLotBranchStockChange(originalIdx, branch.id, e.target.value)}
                                                                    className="h-7 text-[10px] font-bold text-center border-slate-100"
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => setFormData(p => ({ ...p, lots_data: p.lots_data.filter((_, i) => i !== originalIdx) }))}
                                                        className="absolute -top-2 -right-2 h-6 w-6 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        {formData.lots_data.filter(l => !l.variant_id).length === 0 && (
                                            <div className="col-span-full py-8 border-2 border-dashed border-amber-100 rounded-3xl text-center">
                                                <p className="text-[10px] font-black text-amber-600/50 uppercase">No hay lotes definidos para este producto.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* STOCK SIMPLE POR SUCURSAL */
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {branches.map(branch => (
                                            <div key={branch.id} className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 hover:bg-white transition-all shadow-sm">
                                                <Label className="text-[8px] font-black text-slate-400 uppercase truncate block mb-2">{branch.name}</Label>
                                                <Input
                                                    type="number"
                                                    value={formData.branch_stocks?.[branch.id] || ''}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0
                                                        const newStocks = { ...formData.branch_stocks, [branch.id]: val }
                                                        const totalStock = Object.values(newStocks).reduce((a: any, b: any) => a + Number(b), 0)
                                                        setFormData(p => ({ ...p, branch_stocks: newStocks, stock: totalStock }))
                                                    }}
                                                    className="h-9 text-xs font-bold text-center bg-white border-slate-100 focus:border-blue-400"
                                                    placeholder="0"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {/* BLOQUE 2: VARIANTES (MATRIX UX) */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4">
                            <div className="space-y-1">
                                <h3 className="text-blue-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                                    <LayoutGrid size={22} /> Matriz de Variantes
                                </h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Configura tus ejes para una carga rápida</p>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-inner scale-90 origin-right">
                                <div className="flex items-center gap-1.5 pl-2">
                                    <span className="text-[7px] font-black text-slate-400 uppercase">Y:</span>
                                    <Select value={matrixAxisY} onValueChange={setMatrixAxisY}>
                                        <SelectTrigger className="h-6 min-w-[80px] border-none bg-white text-[8px] font-black uppercase rounded-lg shadow-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allPossibleAttributes.map(a => (
                                                <SelectItem key={a.id} value={a.id} className="text-[8px] font-bold uppercase">{a.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-px h-3 bg-slate-200" />
                                <div className="flex items-center gap-1.5 pr-2">
                                    <span className="text-[7px] font-black text-slate-400 uppercase">X:</span>
                                    <Select value={matrixAxisX} onValueChange={setMatrixAxisX}>
                                        <SelectTrigger className="h-6 min-w-[80px] border-none bg-white text-[8px] font-black uppercase rounded-lg shadow-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allPossibleAttributes.map(a => (
                                                <SelectItem key={a.id} value={a.id} className="text-[8px] font-bold uppercase">{a.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={addVariantGroup}
                                className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-8 rounded-full font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95"
                            >
                                <Plus size={16} className="mr-2" /> Agregar {allPossibleAttributes.find(a => a.id === matrixAxisY)?.name}
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {groupedVariants.map((group, groupIdx) => (
                                <Card key={groupIdx} className="rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-100/50 overflow-hidden group/card">
                                    <div className="px-6 py-1 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between min-h-[40px]">
                                        <div className="flex items-center gap-4">
                                            {matrixAxisY === 'color' && (
                                                <div className="relative group/color h-7 w-7 rounded-xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                                                    <input
                                                        type="color"
                                                        value={group.color_hex}
                                                        onChange={(e) => {
                                                            const newVariants = formData.variants.map((v: any) => {
                                                                const yVal = v[matrixAxisY] || (v.custom_attributes?.[matrixAxisY]) || 'ÚNICO'
                                                                if (yVal === group.key) return { ...v, color_hex: e.target.value }
                                                                return v
                                                            })
                                                            setFormData(p => ({ ...p, variants: newVariants }))
                                                        }}
                                                        className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={group.key === 'ÚNICO' ? '' : group.key}
                                                    placeholder="ÚNICO"
                                                    onChange={(e) => {
                                                        const newVal = e.target.value.toUpperCase()
                                                        const oldVal = group.key
                                                        const newVariants = formData.variants.map((v: any) => {
                                                            const yVal = v[matrixAxisY] || (v.custom_attributes?.[matrixAxisY]) || 'ÚNICO'
                                                            if (yVal === oldVal) {
                                                                if (['color', 'size'].includes(matrixAxisY)) return { ...v, [matrixAxisY]: newVal || 'ÚNICO' }
                                                                return { ...v, custom_attributes: { ...v.custom_attributes, [matrixAxisY]: newVal || 'ÚNICO' } }
                                                            }
                                                            return v
                                                        })
                                                        setFormData(p => ({ ...p, variants: newVariants }))
                                                    }}
                                                    className="h-8 border-none bg-transparent text-sm font-black uppercase text-slate-800 focus-visible:ring-0 p-0 w-auto min-w-[150px]"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                onClick={() => addSubVariant(group.key)}
                                                className="h-7 rounded-xl text-blue-600 font-black uppercase text-[8px] hover:bg-blue-50 px-3"
                                            >
                                                <Plus size={12} className="mr-1.5" /> {allPossibleAttributes.find(a => a.id === matrixAxisX)?.name}
                                            </Button>
                                            <div className="w-px h-4 bg-slate-200 mx-1" />
                                            <button
                                                onClick={() => {
                                                    const newVariants = formData.variants.filter((v: any) => {
                                                        const yVal = v[matrixAxisY] || (v.custom_attributes?.[matrixAxisY]) || 'ÚNICO'
                                                        return yVal !== group.key
                                                    })
                                                    setFormData(p => ({ ...p, variants: newVariants }))
                                                }}
                                                className="text-slate-300 hover:text-red-500 transition-all p-1.5 hover:bg-red-50 rounded-lg"
                                                title="Eliminar Grupo"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-1 pb-2 px-6">
                                        <div className="flex flex-wrap gap-2">
                                            {group.items.map((v: any, subIdx: number) => {
                                                const globalIdx = formData.variants.findIndex((orig: any) => orig === v)
                                                return (
                                                    <div key={v.tempId || `v-${globalIdx}-${subIdx}`} className="relative bg-slate-50/50 rounded-2xl p-2 border border-slate-100 hover:bg-white transition-all hover:shadow-md hover:shadow-slate-200/40 w-fit min-w-[110px]">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <Input
                                                                    placeholder={allPossibleAttributes.find(a => a.id === matrixAxisX)?.name.toUpperCase()}
                                                                    value={v[matrixAxisX] || (v.custom_attributes?.[matrixAxisX]) || ''}
                                                                    onChange={(e) => {
                                                                        const newVal = e.target.value.toUpperCase()
                                                                        const n = [...formData.variants]
                                                                        if (['color', 'size'].includes(matrixAxisX)) {
                                                                            n[globalIdx] = { ...n[globalIdx], [matrixAxisX]: newVal }
                                                                        } else {
                                                                            n[globalIdx] = {
                                                                                ...n[globalIdx],
                                                                                custom_attributes: { ...n[globalIdx].custom_attributes, [matrixAxisX]: newVal }
                                                                            }
                                                                        }
                                                                        setFormData(p => ({ ...p, variants: n }))
                                                                    }}
                                                                    className="h-6 border-none bg-transparent font-black text-[10px] uppercase text-slate-700 focus-visible:ring-0 p-0 w-16"
                                                                />
                                                                <button
                                                                    onClick={() => setFormData(p => ({ ...p, variants: p.variants.filter((_: any, idx: number) => idx !== globalIdx) }))}
                                                                    className="h-5 w-5 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors bg-white rounded-full shadow-sm border border-slate-100"
                                                                >
                                                                    <X size={10} />
                                                                </button>
                                                            </div>

                                                            {/* Extra Attributes (3rd+ Dimension) */}
                                                            <div className="flex flex-col gap-1">
                                                                {allPossibleAttributes.filter(attr => attr.id !== matrixAxisX && attr.id !== matrixAxisY).map(attr => (
                                                                    <div key={attr.id} className="flex items-center gap-1.5 px-2 py-1 bg-white/50 rounded-lg border border-slate-100/50">
                                                                        <span className="text-[6px] font-black text-slate-400 uppercase w-10 truncate">{attr.name}:</span>
                                                                        <Input
                                                                            placeholder={attr.name.toUpperCase()}
                                                                            value={v[attr.id] || (v.custom_attributes?.[attr.id]) || ''}
                                                                            onChange={(e) => {
                                                                                const newVal = e.target.value.toUpperCase()
                                                                                const n = [...formData.variants]
                                                                                if (['color', 'size'].includes(attr.id)) {
                                                                                    n[globalIdx] = { ...n[globalIdx], [attr.id]: newVal }
                                                                                } else {
                                                                                    n[globalIdx] = {
                                                                                        ...n[globalIdx],
                                                                                        custom_attributes: { ...n[globalIdx].custom_attributes, [attr.id]: newVal }
                                                                                    }
                                                                                }
                                                                                setFormData(p => ({ ...p, variants: n }))
                                                                            }}
                                                                            className="h-4 border-none bg-transparent font-bold text-[8px] uppercase text-slate-600 focus-visible:ring-0 p-0 flex-1"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* BARCODE GENERATOR FOR VARIANT */}
                                                        {barcodeSettings?.enabled && (
                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50/50 rounded-lg border border-blue-100/50">
                                                                <ScanBarcode size={10} className="text-blue-400 shrink-0" />
                                                                <Input
                                                                    placeholder="Barcode"
                                                                    value={v.barcode || ''}
                                                                    onChange={(e) => {
                                                                        const n = [...formData.variants]
                                                                        n[globalIdx] = { ...n[globalIdx], barcode: e.target.value }
                                                                        setFormData(p => ({ ...p, variants: n }))
                                                                    }}
                                                                    className="h-4 border-none bg-transparent font-mono text-[8px] font-bold text-blue-600 focus-visible:ring-0 p-0 flex-1"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => generateVariantBarcode(globalIdx)}
                                                                    className="text-blue-400 hover:text-blue-600 transition-colors"
                                                                    title="Generar Código"
                                                                >
                                                                    <Wand2 size={10} />
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* GESTIÓN DE LOTES (SI ACTIVO) */}
                                                        {formData.manages_lots ? (
                                                            <div className="space-y-3 mt-1">
                                                                {/* Lista de Lotes para esta variante */}
                                                                {formData.lots_data
                                                                    .map((lot, originalIdx) => ({ lot, originalIdx }))
                                                                    .filter(item => item.lot.variant_id === (v._id || v.id || v.tempId))
                                                                    .map(({ lot, originalIdx }) => (
                                                                        <div key={originalIdx} className="bg-amber-50/40 p-2 rounded-xl border border-amber-100 relative group/lot">
                                                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                                                <div className="space-y-0.5">
                                                                                    <Label className="text-[6px] font-black text-amber-600 uppercase">N° Lote</Label>
                                                                                    <Input
                                                                                        value={lot.lot_number}
                                                                                        onChange={(e) => updateLotRow(originalIdx, 'lot_number', e.target.value.toUpperCase())}
                                                                                        className="h-5 text-[8px] font-bold uppercase bg-white border-amber-100"
                                                                                        placeholder="L-100"
                                                                                    />
                                                                                </div>
                                                                                <div className="space-y-0.5">
                                                                                    <Label className="text-[6px] font-black text-amber-600 uppercase">Venc.</Label>
                                                                                    <Input
                                                                                        type="date"
                                                                                        value={lot.expiration_date}
                                                                                        onChange={(e) => updateLotRow(originalIdx, 'expiration_date', e.target.value)}
                                                                                        className="h-5 text-[8px] font-bold bg-white border-amber-100 p-0 px-1"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-1 mb-1">
                                                                                {branches.map(branch => (
                                                                                    <div key={branch.id} className="flex flex-col gap-0.5">
                                                                                        <span className="text-[5px] font-black text-slate-400 uppercase truncate text-center">{branch.name}</span>
                                                                                        <Input
                                                                                            type="number"
                                                                                            value={lot.branch_stocks[branch.id] || ''}
                                                                                            onChange={(e) => handleLotBranchStockChange(originalIdx, branch.id, e.target.value)}
                                                                                            className="h-4 text-[7.5px] font-bold text-center bg-white border-slate-100 p-0"
                                                                                            placeholder="0"
                                                                                        />
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            <button
                                                                                onClick={() => setFormData(p => ({ ...p, lots_data: p.lots_data.filter((_, i) => i !== originalIdx) }))}
                                                                                className="absolute -top-1 -right-1 h-4 w-4 bg-white border border-red-100 text-red-400 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/lot:opacity-100 transition-opacity"
                                                                            >
                                                                                <X size={8} />
                                                                            </button>
                                                                        </div>
                                                                    ))}

                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => handleAddLotRow(v._id || v.id || v.tempId)}
                                                                    className="w-full h-6 border-dashed border-amber-200 bg-amber-50/20 text-amber-600 text-[8px] font-black uppercase hover:bg-amber-100 hover:border-amber-400 transition-all"
                                                                >
                                                                    <Plus size={10} className="mr-1" /> Nuevo Lote
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            /* STOCK ESTÁNDAR (SIN LOTES) */
                                                            <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                                                                {branches.map(branch => (
                                                                    <div key={branch.id} className="flex flex-col items-center gap-0.5 bg-white p-1 rounded-lg border border-slate-100 shadow-sm">
                                                                        <Label className="text-[5px] font-black text-slate-400 uppercase w-7 text-center truncate">{branch.name}</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={v.branch_stocks[branch.id] || ''}
                                                                            onChange={(e) => handleBranchStockChange(globalIdx, branch.id, e.target.value)}
                                                                            className="h-5 w-8 bg-transparent text-[9px] font-bold text-center rounded-md border-none focus:ring-1 focus:ring-blue-400 p-0"
                                                                            placeholder="0"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="pt-1 border-t border-slate-100 flex justify-between items-center bg-slate-100/30 -mx-3 -mb-3 px-3 rounded-b-2xl py-1 mt-1">
                                                            <span className="text-[7px] font-black text-slate-400 uppercase">Stock Total:</span>
                                                            <span className="text-[9px] font-black text-slate-700">
                                                                {formData.manages_lots
                                                                    ? formData.lots_data
                                                                        .filter(l => l.variant_id === (v._id || v.id || v.tempId))
                                                                        .reduce((acc, l) => acc + Object.values(l.branch_stocks || {}).reduce((sum: any, val: any) => sum + (Number(val) || 0), 0), 0)
                                                                    : v.stock || 0
                                                                } U.
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </Card>
                            ))}

                            {formData.variants.length === 0 && (
                                <div className="p-12 border-2 border-dashed border-slate-100 rounded-[3rem] text-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                        <LayoutGrid size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-tighter">Sin variantes</p>
                                        <p className="text-[10px] text-slate-300 font-bold uppercase">Pulsa el botón azul para agregar tu primer grupo de variantes</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea >

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-center shrink-0">
                    <Button onClick={handleSubmit} disabled={loading} className="bg-slate-900 hover:bg-black text-white h-12 px-12 rounded-full font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2">
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : isEditMode ? <RefreshCw size={18} /> : <Save size={18} />} {actionLabel}
                    </Button>
                </div>

                <Dialog open={isPricingModalOpen} onOpenChange={setIsPricingModalOpen}>
                    <DialogContent className="w-[95vw] sm:max-w-4xl bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden font-sans max-h-[95vh] md:h-auto flex flex-col">
                        <DialogHeader className="sr-only"><DialogTitle>Gestor de Precios</DialogTitle></DialogHeader>

                        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden md:h-[600px]">
                            {/* LEFT COLUMN: COST */}
                            <div className="w-full md:w-[35%] bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-8 flex flex-col justify-center relative overflow-hidden shrink-0">
                                <div className="relative z-10 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Costo Base Global</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-2xl font-black">$</span>
                                            <input
                                                type="number"
                                                value={formData.cost}
                                                onChange={(e) => handleMainCostChange(e.target.value)}
                                                className="w-full bg-white border-2 border-slate-100 rounded-2xl h-20 pl-10 pr-4 text-3xl font-black text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all text-center placeholder:text-slate-200 shadow-sm"
                                                placeholder="0.00"
                                                autoFocus
                                            />
                                        </div>
                                        <p className="text-slate-400 text-[10px] leading-relaxed text-center px-4">
                                            Este costo se aplica a todas las listas. Modificarlo recalculará automáticamente los precios finales según la utilidad configurada.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: LISTS */}
                            <div className="w-full md:w-[65%] flex flex-col bg-slate-50 min-h-0">
                                <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center shadow-sm z-10">
                                    <h3 className="text-slate-800 font-black uppercase tracking-wide text-sm">Listas de Precios</h3>
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-500">{lists.length} Listas Activas</Badge>
                                </div>

                                <ScrollArea className="flex-1 p-6">
                                    <div className="space-y-4 pb-20">
                                        {lists.map((list: any) => {
                                            const raw = formData.pricing[list.id] || {};
                                            const data = {
                                                cost: formData.cost || 0, // Visual only
                                                utilityValue: raw.utilityValue ?? 0,
                                                utilityType: raw.utilityType || 'percentage',
                                                finalPrice: raw.finalPrice ?? raw.price ?? 0
                                            };
                                            return (
                                                <div key={list.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        {/* List Name Badge */}
                                                        <div className="w-[120px] shrink-0">
                                                            <Badge className={cn("px-3 py-1.5 rounded-lg uppercase tracking-wider text-[10px] font-black w-full justify-center", list.is_default ? "bg-slate-900 text-white" : "bg-blue-50 text-blue-600")}>
                                                                {list.name}
                                                            </Badge>
                                                        </div>

                                                        {/* Utility Input */}
                                                        <div className="w-[140px] shrink-0 space-y-1">
                                                            <Label className="text-[8px] font-black text-slate-300 uppercase block pl-1">Utilidad</Label>
                                                            <div className="flex items-center h-9 bg-slate-50 rounded-lg border border-transparent group-hover:border-slate-200 transition-colors overflow-hidden">
                                                                <input
                                                                    type="number"
                                                                    value={data.utilityValue}
                                                                    onChange={(e) => handlePriceCalc(list.id, 'utilityValue', e.target.value)}
                                                                    className="flex-1 h-full bg-transparent text-center text-xs font-bold text-slate-700 focus:outline-none"
                                                                />
                                                                <div className="h-[60%] w-px bg-slate-200 mx-1"></div>
                                                                <select
                                                                    value={data.utilityType}
                                                                    onChange={(e) => handlePriceCalc(list.id, 'utilityType', e.target.value)}
                                                                    className="h-full bg-transparent text-[10px] font-black px-2 text-slate-500 focus:outline-none cursor-pointer hover:text-blue-600"
                                                                >
                                                                    <option value="percentage">%</option>
                                                                    <option value="fixed">$</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Arrow */}
                                                        <div className="text-slate-300"><ChevronsUpDown className="rotate-90 w-4 h-4" /></div>

                                                        {/* Final Price Input */}
                                                        <div className="flex-1 space-y-1">
                                                            <Label className="text-[8px] font-black text-blue-300 uppercase block pl-1">Precio Final</Label>
                                                            <div className="relative">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-300 text-[10px] font-bold">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={data.finalPrice}
                                                                    onChange={(e) => handlePriceCalc(list.id, 'finalPrice', e.target.value)}
                                                                    className="w-full h-9 pl-5 bg-blue-50/10 border border-blue-100 rounded-lg text-center text-xs font-black text-blue-600 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>

                                <div className="p-4 border-t border-slate-100 flex justify-end bg-white">
                                    <Button onClick={() => setIsPricingModalOpen(false)} className="bg-slate-900 hover:bg-black text-white px-8 rounded-xl font-bold uppercase text-[10px] shadow-lg">
                                        Confirmar y Cerrar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={showUpdateDateConfirm} onOpenChange={setShowUpdateDateConfirm}>
                    <DialogContent className="w-[90vw] sm:max-w-sm bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[200]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-center">¿Actualizar Fecha?</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center text-center space-y-4">
                            <p className="text-xs font-medium text-slate-500">¿Deseas que se actualice la fecha de modificación del producto?</p>
                            <div className="w-full grid grid-cols-2 gap-3 mt-4">
                                <Button variant="outline" onClick={() => executeSubmit(false)} className="rounded-xl h-12 font-bold uppercase text-[10px]">No, Mantener</Button>
                                <Button onClick={() => executeSubmit(true)} className="bg-slate-900 text-white rounded-xl h-12 font-black uppercase text-[10px]">Sí, Actualizar</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div >
        </>
    )
}
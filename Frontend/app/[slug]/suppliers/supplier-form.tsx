'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Plus, Trash2, X, ImageUp, Check, Link as LinkIcon, Mail, Phone, MapPin, MessageCircle, AlertCircle, Upload, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { createSupplierAction, updateSupplierAction } from './actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import ExcelJS from 'exceljs';

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
                const MAX_WIDTH = 800;
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
                resolve(canvas.toDataURL('image/webp', 0.8));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

interface SupplierFormProps {
    initialData?: any;
    orgId: string;
    slug: string;
    categories: any[];
    onSuccess?: () => void;
    onCancel?: () => void;
    settings?: any;
}

import { LimitReachedModal } from '@/components/limit-reached-modal';

// ... imports

export function SupplierForm({ initialData, orgId, slug, categories, onSuccess, onCancel, settings }: SupplierFormProps) {
    const [loading, setLoading] = useState(false);

    // Limit Modal
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [limitType, setLimitType] = useState<'users' | 'products' | 'suppliers' | 'customers' | 'generic'>('generic');


    // Image State
    const [imageProcessing, setImageProcessing] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null);
    const [imageUrl, setImageUrl] = useState<string>(initialData?.image_url || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEditMode = !!initialData;

    const [formData, setFormData] = useState({
        code: initialData?.code || '',
        name: initialData?.name || '',
        tax_id: initialData?.tax_id || '',
        contact_name: initialData?.contact_name || '',
        web_url: initialData?.web_url || '',
        instagram: initialData?.instagram || '',
        tiktok: initialData?.tiktok || '',
        is_active_account: initialData?.has_active_account ?? false,
        credit_limit: initialData?.credit_limit || 0,
        category_ids: initialData?.category_ids || [],
    });

    const [addresses, setAddresses] = useState<any[]>(initialData?.addresses || []);
    const [phones, setPhones] = useState<any[]>(initialData?.phones || []);
    const [emails, setEmails] = useState<any[]>(initialData?.emails || []);

    // NEW: Import Configuration States
    const [importConfig, setImportConfig] = useState<Record<string, string>>(initialData?.import_config || {});
    const [sampleHeaders, setSampleHeaders] = useState<string[]>([]);
    const [sampleFileLoading, setSampleFileLoading] = useState(false);
    const sampleFileDialogRef = useRef<HTMLInputElement>(null);

    const getSupplierImportFields = () => {
        const baseFields = [
            { key: 'name', label: 'Nombre / Producto', aliases: ['descripcion', 'producto', 'nombre', 'articulo', 'detalle', 'nombre / producto'] },
            { key: 'sku', label: 'SKU / Código Referencia', aliases: ['code', 'codigo', 'id', 'referencia', 'código sku'] },
            { key: 'barcode', label: 'Código de Barras', aliases: ['barra', 'ean', 'upc', 'barcode', 'código de barras'] },
            { key: 'cost', label: 'Costo de Compra', aliases: ['compra', 'base', 'costo', 'cost', 'costo de compra'] },
            { key: 'price', label: 'Precio de Venta Final (PV)', aliases: ['final', 'venta', 'pvp', 'precio', 'price', 'precio final'] },
        ];

        // Inject Dynamic Price Lists from settings
        const priceLists = settings?.inventory?.price_lists || [];
        priceLists.filter((pl: any) => pl.is_active).forEach((pl: any) => {
            baseFields.push({
                key: `price_list_${pl.id || pl._id}`,
                label: `Precio: ${pl.name}`,
                aliases: [pl.name.toLowerCase(), `precio_${pl.name.toLowerCase()}`, `precio: ${pl.name.toLowerCase()}`]
            });
        });

        const extraFields = [
            { key: 'stock', label: 'Stock Actual', aliases: ['cantidad', 'existencia', 'stock', 'cant', 'stock actual'] },
            { key: 'min_stock', label: 'Stock Mínimo', aliases: ['minimo', 'min_stock', 'alerta_stock', 'stock mínimo'] },
            { key: 'tax_rate', label: 'IVA %', aliases: ['iva', 'tasa', 'impuesto', 'tax', 'tasa iva %'] },
            { key: 'category', label: 'Categoría / Rubro', aliases: ['rubro', 'familia', 'categoria', 'category', 'categorías'] },
            { key: 'description', label: 'Descripción Detallada', aliases: ['comentario', 'notas', 'info', 'desc', 'descripción'] },
            { key: 'supplier_product_code', label: 'Cód. Producto Prov.', aliases: ['cod_prov', 'codigo_proveedor', 'suplier_code', 'código proveedor'] }
        ];

        return [...baseFields, ...extraFields];
    };

    const getExcelLetterCode = (idx: number): string => {
        let letter = '';
        while (idx >= 0) {
            letter = String.fromCharCode((idx % 26) + 65) + letter;
            idx = Math.floor(idx / 26) - 1;
        }
        return letter;
    };

    const handleSampleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSampleFileLoading(true);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const worksheet = workbook.getWorksheet(1);

            if (worksheet) {
                const headers: string[] = [];
                worksheet.getRow(1).eachCell((cell, colNumber) => {
                    headers.push(cell.text || `Columna ${colNumber}`);
                });
                setSampleHeaders(headers);

                // Optional: Auto-map based on headers
                const newConfig = { ...importConfig };
                const fields = getSupplierImportFields();
                headers.forEach(h => {
                    const lowerH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const match = fields.find(f =>
                        lowerH.includes(f.key) || (f.aliases && f.aliases.some(a => lowerH.includes(a)))
                    );
                    if (match && !newConfig[match.key]) {
                        newConfig[match.key] = h;
                    }
                });
                setImportConfig(newConfig);
                toast.success("Archivo de ejemplo analizado correctamente");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al leer archivo de ejemplo");
        } finally {
            setSampleFileLoading(false);
        }
    };

    // HANDLERS
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("La imagen no puede superar los 5MB");
            return;
        }

        try {
            setImageProcessing(true);
            const compressed = await compressImage(file);
            setImageUrl(compressed);
            setImagePreview(compressed);
        } catch (error) {
            console.error(error);
            toast.error("Error al procesar imagen");
        } finally {
            setImageProcessing(false);
        }
    };

    const handleRemoveImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setImageUrl('');
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Address Handlers
    const handleAddAddress = () => {
        setAddresses([...addresses, { street: '', city: '', province: '', country: 'Argentina' }]);
    };
    const handleRemoveAddress = (index: number) => {
        setAddresses(addresses.filter((_, i) => i !== index));
    };
    const handleAddressChange = (index: number, field: string, value: string) => {
        const newAddresses = [...addresses];
        newAddresses[index] = { ...newAddresses[index], [field]: value };
        setAddresses(newAddresses);
    };

    // Phone Handlers
    const handleAddPhone = () => {
        setPhones([...phones, { number: '', type: 'mobile', notes: '' }]);
    };
    const handleRemovePhone = (index: number) => {
        setPhones(phones.filter((_, i) => i !== index));
    };
    const handlePhoneChange = (index: number, field: string, value: string) => {
        const newPhones = [...phones];
        newPhones[index] = { ...newPhones[index], [field]: value };
        setPhones(newPhones);
    };

    // Email Handlers
    const handleAddEmail = () => {
        setEmails([...emails, { email: '', type: 'work', notes: '' }]);
    };
    const handleRemoveEmail = (index: number) => {
        setEmails(emails.filter((_, i) => i !== index));
    };
    const handleEmailChange = (index: number, field: string, value: string) => {
        const newEmails = [...emails];
        newEmails[index] = { ...newEmails[index], [field]: value };
        setEmails(newEmails);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // ... payload preparation
        const payload = {
            ...formData,
            addresses,
            phones,
            emails,
            image_url: imageUrl,
            import_config: importConfig
        };

        try {
            let res;
            if (isEditMode) {
                res = await updateSupplierAction(orgId, slug, initialData.id, payload);
            } else {
                const data = new FormData();
                Object.entries(formData).forEach(([key, value]) => {
                    if (key !== 'category_ids') data.append(key, value as string);
                });
                data.append('category_ids', JSON.stringify(formData.category_ids)); // Fixed duplicate loop issue potentially
                data.append('addresses', JSON.stringify(addresses));
                data.append('phones', JSON.stringify(phones));
                data.append('emails', JSON.stringify(emails));
                data.append('import_config', JSON.stringify(importConfig));
                if (imageUrl) data.append('image_url', imageUrl);

                res = await createSupplierAction(orgId, slug, data);
            }

            if (res?.error) {
                if (res.error.includes('LIMIT_REACHED')) {
                    setLimitType('suppliers');
                    setShowLimitModal(true);
                } else {
                    toast.error(res.error);
                }
            } else {
                toast.success(isEditMode ? "Proveedor actualizado" : "Proveedor creado");
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <LimitReachedModal isOpen={showLimitModal} onClose={() => setShowLimitModal(false)} limitType={limitType} />
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 pt-6 shrink-0">
                        <TabsList className="w-full justify-start h-auto p-1 bg-slate-100 rounded-xl mb-4">
                            <TabsTrigger value="general" className="rounded-lg px-4 py-2 text-xs font-bold uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                                Información General
                            </TabsTrigger>
                            <TabsTrigger value="import" className="rounded-lg px-4 py-2 text-xs font-bold uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                                Configuración de Importación
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                        <TabsContent value="general" className="space-y-6 mt-0">
                            {/* Main Info */}
                            <div className="space-y-6">
                                {/* ROW 1: AVATAR + CODE */}
                                <div className="flex gap-6">
                                    {/* AVATAR */}
                                    {/* AVATAR */}
                                    <div className="shrink-0 space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-500">Logo / Avatar</Label>
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-blue-500 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageChange}
                                            />

                                            {imageProcessing ? (
                                                <Loader2 className="animate-spin text-blue-500" />
                                            ) : imagePreview ? (
                                                <>
                                                    <img
                                                        src={imagePreview}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveImage}
                                                        className="absolute top-1 right-1 bg-white/90 text-slate-400 hover:text-red-500 rounded-full p-1 shadow-sm border border-slate-100 transition-colors z-20 opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <ImageUp size={24} className="text-slate-300 group-hover:text-blue-500 transition-colors mb-2" />
                                                    <span className="text-[10px] uppercase font-bold text-slate-400">Subir Logo</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* CODE (Fills remaining width) */}
                                    <div className="flex-1 space-y-2">
                                        <Label htmlFor="code" className="text-xs font-black uppercase text-slate-500">Código</Label>
                                        <Input
                                            id="code"
                                            value={formData.code}
                                            onChange={(e) => setFormData(d => ({ ...d, code: e.target.value }))}
                                            placeholder="Auto (Vacío)"
                                            className="font-mono font-bold uppercase rounded-xl h-11 border-slate-200"
                                        />
                                    </div>
                                </div>

                                {/* ROW 2: NAME + TAX ID */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-8 space-y-2">
                                        <Label htmlFor="name" className="text-xs font-black uppercase text-slate-500">Nombre / Razón Social *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                                            placeholder="Ej: Distribuidora Oeste S.R.L."
                                            required
                                            className="font-bold uppercase rounded-xl h-11 border-slate-200"
                                        />
                                    </div>
                                    <div className="md:col-span-4 space-y-2">
                                        <Label htmlFor="tax_id" className="text-xs font-black uppercase text-slate-500">DNI / CUIT</Label>
                                        <Input
                                            id="tax_id"
                                            value={formData.tax_id}
                                            onChange={(e) => setFormData(d => ({ ...d, tax_id: e.target.value }))}
                                            placeholder="Ej: 30-12345678-9"
                                            className="rounded-xl h-11 border-slate-200"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Checking Account Switch */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold text-slate-700">Cuenta Corriente</Label>
                                    <p className="text-xs text-slate-500">Habilitar cuenta corriente para registrar pagos y facturas.</p>
                                </div>
                                <Switch
                                    checked={formData.is_active_account}
                                    onCheckedChange={(checked) => setFormData(d => ({ ...d, is_active_account: checked }))}
                                />
                            </div>

                            {/* Credit Limit Input (Conditional) */}
                            {formData.is_active_account && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Label htmlFor="credit_limit" className="text-xs font-black uppercase text-slate-500">Límite de Crédito Descubierto</Label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                                        <Input
                                            id="credit_limit"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.credit_limit}
                                            onChange={(e) => setFormData(d => ({ ...d, credit_limit: Number(e.target.value) }))}
                                            className="pl-7 font-bold text-slate-900"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 italic">Monto máximo de deuda permitida antes de alertar.</p>
                                </div>
                            )}

                            {/* Emails (Multi-field) */}
                            <div className="space-y-4 border-t border-slate-100 pt-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black uppercase text-slate-400">Emails de Contacto</h3>
                                    <Button type="button" onClick={handleAddEmail} variant="outline" size="sm" className="h-7 text-xs gap-1">
                                        <Plus size={12} /> Agregar
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {emails.map((em, index) => (
                                        <div key={index} className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <div className="pt-2 text-slate-300">
                                                <Mail size={16} />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Email (contacto@...)"
                                                        value={em.email}
                                                        onChange={(e) => handleEmailChange(index, 'email', e.target.value)}
                                                        className="h-8 text-xs bg-white flex-1"
                                                        type="email"
                                                    />
                                                    <Input
                                                        value={em.contact_name}
                                                        onChange={(e) => handleEmailChange(index, 'contact_name', e.target.value)}
                                                        placeholder="Nombre del Contacto"
                                                        className="h-8 text-xs bg-white flex-1"
                                                    />
                                                </div>
                                                <Input
                                                    placeholder="Referencia (Ventas, Administración...)"
                                                    value={em.notes}
                                                    onChange={(e) => handleEmailChange(index, 'notes', e.target.value)}
                                                    className="h-8 text-xs bg-white w-full"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                onClick={() => handleRemoveEmail(index)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    ))}
                                    {emails.length === 0 && (
                                        <div className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-lg dashed border border-slate-200">
                                            Agrega al menos un email de contacto.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Addresses */}
                            <div className="space-y-4 border-t border-slate-100 pt-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black uppercase text-slate-400">Direcciones y Sucursales</h3>
                                    <Button type="button" onClick={handleAddAddress} variant="outline" size="sm" className="h-7 text-xs gap-1">
                                        <Plus size={12} /> Agregar
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {addresses.map((addr, index) => (
                                        <div key={index} className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <div className="pt-2 text-slate-300">
                                                <MapPin size={16} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 flex-1">
                                                {/* Row 1: Street & Gallery */}
                                                <Input
                                                    placeholder="Calle y Altura"
                                                    value={addr.street}
                                                    onChange={(e) => handleAddressChange(index, 'street', e.target.value)}
                                                    className="h-8 text-xs bg-white md:col-span-4"
                                                />
                                                <Input
                                                    placeholder="Galería / Piso / Depto"
                                                    value={addr.gallery || ''}
                                                    onChange={(e) => handleAddressChange(index, 'gallery', e.target.value)}
                                                    className="h-8 text-xs bg-white md:col-span-2"
                                                />

                                                {/* Row 2: City, Province, Zip */}
                                                <Input
                                                    placeholder="Ciudad / Localidad"
                                                    value={addr.city}
                                                    onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                                                    className="h-8 text-xs bg-white md:col-span-2"
                                                />
                                                <Input
                                                    placeholder="Provincia"
                                                    value={addr.province || ''}
                                                    onChange={(e) => handleAddressChange(index, 'province', e.target.value)}
                                                    className="h-8 text-xs bg-white md:col-span-2"
                                                />
                                                <Input
                                                    placeholder="C. Postal"
                                                    value={addr.postal_code || ''}
                                                    onChange={(e) => handleAddressChange(index, 'postal_code', e.target.value)}
                                                    className="h-8 text-xs bg-white md:col-span-2"
                                                />

                                                {/* Row 3: Notes (Schedules) */}
                                                <Input
                                                    placeholder="Notas (Horarios, Referencias, Encargado...)"
                                                    value={addr.notes}
                                                    onChange={(e) => handleAddressChange(index, 'notes', e.target.value)}
                                                    className="h-8 text-xs bg-white md:col-span-6"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                onClick={() => handleRemoveAddress(index)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    ))}
                                    {addresses.length === 0 && (
                                        <div className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-lg dashed border border-slate-200">
                                            No hay direcciones registradas.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Phones (Multi-field) */}
                            <div className="space-y-4 border-t border-slate-100 pt-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black uppercase text-slate-400">Teléfonos de Contacto</h3>
                                    <Button type="button" onClick={handleAddPhone} variant="outline" size="sm" className="h-7 text-xs gap-1">
                                        <Plus size={12} /> Agregar
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {phones.map((ph, index) => (
                                        <div key={index} className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <div className="pt-2 text-slate-300">
                                                <Phone size={16} />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex gap-2">
                                                    <div className="flex-1 flex gap-1">
                                                        <Input
                                                            placeholder="Número (+54...)"
                                                            value={ph.number}
                                                            onChange={(e) => handlePhoneChange(index, 'number', e.target.value)}
                                                            className="h-8 text-xs bg-white flex-1"
                                                        />
                                                        {ph.number && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                onClick={() => {
                                                                    const cleanNumber = ph.number.replace(/\D/g, '');
                                                                    if (cleanNumber) window.open(`https://wa.me/${cleanNumber}`, '_blank');
                                                                }}
                                                                title="Abrir WhatsApp"
                                                            >
                                                                <MessageCircle size={14} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {index === 0 && (
                                                        <Input
                                                            value={formData.contact_name}
                                                            onChange={(e) => setFormData(d => ({ ...d, contact_name: e.target.value }))}
                                                            placeholder="Nombre del Contacto"
                                                            className="h-8 text-xs bg-white flex-1"
                                                        />
                                                    )}
                                                </div>
                                                <Input
                                                    placeholder="Referencia (Ventas, Administración...)"
                                                    value={ph.notes}
                                                    onChange={(e) => handlePhoneChange(index, 'notes', e.target.value)}
                                                    className="h-8 text-xs bg-white w-full"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                onClick={() => handleRemovePhone(index)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    ))}
                                    {phones.length === 0 && (
                                        <div className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-lg dashed border border-slate-200 space-y-2">
                                            <p>Agrega al menos un teléfono de contacto.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Social & Web (Moved to Bottom) */}
                            <div className="space-y-4 border-t border-slate-100 pt-4">
                                <h3 className="text-xs font-black uppercase text-slate-400">Redes y Web</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-slate-500">Sitio Web</Label>
                                        <div className="relative">
                                            <LinkIcon size={14} className="absolute left-3 top-3 text-slate-400" />
                                            <Input
                                                className="pl-9"
                                                value={formData.web_url}
                                                onChange={(e) => setFormData(d => ({ ...d, web_url: e.target.value }))}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-slate-500">Instagram</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">@</span>
                                            <Input
                                                className="pl-7"
                                                value={formData.instagram}
                                                onChange={(e) => setFormData(d => ({ ...d, instagram: e.target.value }))}
                                                placeholder="usuario"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-slate-500">TikTok</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">@</span>
                                            <Input
                                                className="pl-7"
                                                value={formData.tiktok}
                                                onChange={(e) => setFormData(d => ({ ...d, tiktok: e.target.value }))}
                                                placeholder="usuario"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CATEGORIES SECTION */}
                            <div className="space-y-4 border-t border-slate-100 pt-6">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-xs font-black uppercase text-slate-400">Rubros Que Ofrece o Vende</h3>
                                    <p className="text-[10px] text-slate-500 italic">Asocia los rubros que ofrece esta empresa para facilitar la categorización de productos.</p>
                                </div>

                                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {formData.category_ids.map((catId: string) => {
                                            const cat = categories.find(c => (c._id || c.id) === catId);
                                            return (
                                                <div key={catId} className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm animate-in zoom-in-95 duration-200">
                                                    <span className="text-xs font-bold text-slate-700">{cat?.name || 'Cargando...'}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            category_ids: prev.category_ids.filter((id: string) => id !== catId)
                                                        }))}
                                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {formData.category_ids.length === 0 && (
                                            <p className="text-[10px] text-slate-400 py-2">No hay rubros asociados.</p>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <Select
                                            onValueChange={(val) => {
                                                if (!formData.category_ids.includes(val)) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        category_ids: [...prev.category_ids, val]
                                                    }));
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="w-full bg-white rounded-xl border-slate-200 text-xs h-10">
                                                <div className="flex items-center gap-2">
                                                    <Plus size={14} className="text-slate-400" />
                                                    <SelectValue placeholder="Seleccionar Rubro para Agregar..." />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200">
                                                {categories
                                                    .filter(c => !formData.category_ids.includes(c._id || c.id))
                                                    .map(c => (
                                                        <SelectItem key={c._id || c.id} value={c._id || c.id} className="text-xs">
                                                            {c.name}
                                                        </SelectItem>
                                                    ))
                                                }
                                                {categories.length === 0 && (
                                                    <div className="p-2 text-center text-[10px] text-slate-400 italic">No hay más rubros disponibles.</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* FUNCTIONAL IMPORT TAB */}
                        <TabsContent value="import" className="space-y-6 mt-0">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800 text-sm">
                                <AlertCircle size={20} className="shrink-0" />
                                <div>
                                    <p className="font-bold">Configura cómo leer los archivos de este proveedor.</p>
                                    <p className="text-blue-600/80 text-xs mt-1">Sube un archivo de ejemplo para detectar cabeceras o ingresa manualmente la letra de la columna (A, B, C, etc.).</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-xs font-black uppercase text-slate-500">Subir Plantilla (Opcional para detectar cabeceras)</Label>
                                <input
                                    type="file"
                                    hidden
                                    ref={sampleFileDialogRef}
                                    onChange={handleSampleFileUpload}
                                    accept=".csv,.xlsx,.xls"
                                />
                                <div
                                    onClick={() => sampleFileDialogRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group"
                                >
                                    {sampleFileLoading ? (
                                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                                    ) : sampleHeaders.length > 0 ? (
                                        <>
                                            <Check className="h-8 w-8 text-green-500 mb-2" />
                                            <span className="text-sm font-bold text-slate-600">Archivo Analizado: {sampleHeaders.length} columnas</span>
                                            <span className="text-xs text-slate-400">Haz clic para cambiar el archivo de ejemplo</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-8 w-8 text-slate-300 group-hover:text-blue-500 mb-2 transition-colors" />
                                            <span className="text-sm font-medium text-slate-600">Subir lista de precios (Ejemplo)</span>
                                            <span className="text-xs text-slate-400">.CSV, .XLSX</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Mapping Table */}
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-slate-50 px-4 py-3 border-b flex items-center text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                    <div className="w-1/2">Campo en mi Sistema</div>
                                    <div className="w-1/2">Columna en Archivo (Nombre o Letra)</div>
                                </div>
                                <div className="divide-y max-h-[400px] overflow-y-auto">
                                    {getSupplierImportFields().map((field) => (
                                        <div key={field.key} className="px-4 py-3 flex items-center gap-4 bg-white hover:bg-slate-50/50 transition-colors">
                                            <div className="w-1/2">
                                                <p className="font-bold text-xs text-slate-700">{field.label}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{field.key}</p>
                                            </div>
                                            <div className="w-1/2 flex items-center gap-2">
                                                <ArrowRight size={14} className="text-slate-300 shrink-0" />
                                                <div className="flex-1 relative group">
                                                    <Input
                                                        placeholder="Escribe letra (A, B...) o nombre"
                                                        value={importConfig[field.key] || ''}
                                                        autoComplete="off"
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setImportConfig(prev => ({ ...prev, [field.key]: val }));
                                                        }}
                                                        className="h-9 text-xs font-bold uppercase border-slate-200 focus:ring-blue-100 pr-8"
                                                    />
                                                    {importConfig[field.key] && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setImportConfig(prev => {
                                                                const n = { ...prev };
                                                                delete n[field.key];
                                                                return n;
                                                            })}
                                                            className="absolute right-2 top-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Suggestions popover if sampleHeaders are available */}
                                                {sampleHeaders.length > 0 && (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 bg-blue-50 hover:bg-blue-100">
                                                                <Plus size={14} />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[280px] p-0 rounded-xl overflow-hidden" align="end">
                                                            <Command className="border-none">
                                                                <CommandInput placeholder="Buscar columna..." className="h-9 text-xs" />
                                                                <CommandList className="max-h-[250px]">
                                                                    <CommandEmpty className="text-xs p-4 text-center text-slate-400">No se encontraron columnas.</CommandEmpty>
                                                                    <CommandGroup heading="Columnas del archivo">
                                                                        {sampleHeaders.map((h, idx) => (
                                                                            <CommandItem
                                                                                key={idx}
                                                                                onSelect={() => {
                                                                                    setImportConfig(prev => ({ ...prev, [field.key]: h }));
                                                                                }}
                                                                                className="text-xs cursor-pointer flex justify-between items-center"
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[9px] font-black text-slate-500">{getExcelLetterCode(idx)}</span>
                                                                                    <span className="truncate max-w-[150px]">{h}</span>
                                                                                </div>
                                                                                {importConfig[field.key] === h && <Check size={12} className="text-green-500" />}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <div className="p-6 pt-4 flex justify-end gap-3 border-t border-slate-100 shrink-0 bg-white z-10">
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl h-12 px-6 font-bold text-xs uppercase"
                        onClick={onCancel}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="bg-slate-900 text-white gap-2 font-black uppercase text-xs tracking-wide rounded-xl h-12 px-6"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {isEditMode ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
                    </Button>
                </div>
            </form>
        </>
    );
}

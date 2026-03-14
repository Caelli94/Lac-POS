'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createCustomerAction, updateCustomerAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from "@/components/ui/switch"
import { Save, Loader2, X, User, Phone, Mail, MapPin, ImageUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Utility to compress image (Shared with ProductForm)
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

interface Props {
    orgId: string
    slug: string
    initialData?: any
    onSuccess?: () => void
    onCancel?: () => void
    settings?: any
}

import { LimitReachedModal } from '@/components/limit-reached-modal'

// ... existing imports

export function CustomerForm({ orgId, slug, initialData, onSuccess, onCancel, settings }: Props) {
    const [isPending, startTransition] = useTransition()
    const [showCreditLimit, setShowCreditLimit] = useState(!!initialData?.has_active_account)
    const [imageProcessing, setImageProcessing] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null)

    // Limit Modal State
    const [showLimitModal, setShowLimitModal] = useState(false)
    const [limitType, setLimitType] = useState<'users' | 'products' | 'suppliers' | 'customers' | 'generic'>('generic')

    // We use a hidden input to store the Base64 string for the Server Action
    const [imageUrl, setImageUrl] = useState<string>(initialData?.image_url || '')

    const formRef = useRef<HTMLFormElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isEditMode = !!initialData;

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageProcessing(true);
        try {
            const compressedBase64 = await compressImage(file);
            setImagePreview(compressedBase64);
            setImageUrl(compressedBase64);
            toast.success("Imagen procesada");
        } catch (err) {
            console.error(err);
            toast.error("Error al procesar imagen");
        } finally {
            setImageProcessing(false);
        }
    };

    const handleRemoveImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setImagePreview(null);
        setImageUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        startTransition(async () => {
            let result;
            if (isEditMode) {
                const updateWithId = updateCustomerAction.bind(null, orgId, slug, initialData.id)
                result = await updateWithId(formData)
            } else {
                const createWithId = createCustomerAction.bind(null, orgId, slug)
                result = await createWithId(formData)
            }

            if (result.error) {
                if (result.error.includes('LIMIT_REACHED')) {
                    setLimitType('customers');
                    setShowLimitModal(true);
                } else {
                    toast.error(result.error)
                }
            } else {
                toast.success(result.success)
                if (onSuccess) onSuccess()
            }
        })
    }

    return (
        <>
            <LimitReachedModal isOpen={showLimitModal} onClose={() => setShowLimitModal(false)} limitType={limitType} />
            <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full bg-white">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* SECCIÓN: DATOS GENERALES */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <User size={16} className="text-slate-400" />
                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Información General</h3>
                        </div>

                        <div className="space-y-4">
                            {/* ROW 1: AVATAR + CODE */}
                            <div className="flex gap-6">
                                {/* AVATAR (Conditional) */}
                                {!settings?.disabled_tabs?.includes('customer_avatar') && (
                                    <div className="shrink-0">
                                        <Label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Avatar</Label>

                                        {/* HIDDEN INPUT FOR BASE64 */}
                                        <input type="hidden" name="image_url" value={imageUrl} />

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
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Subir Foto</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* CODE (Fills remaining width next to Avatar) */}
                                <div className="flex-1 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="code" className="text-[10px] font-black uppercase text-slate-400">Código</Label>
                                        <Input
                                            id="code"
                                            name="code"
                                            placeholder="Auto"
                                            defaultValue={initialData?.code || ''}
                                            className="rounded-xl border-slate-200 font-mono font-bold h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="surcharge_rate" className="text-[10px] font-black uppercase text-slate-400">Recargo / Descuento (%)</Label>
                                        <div className="relative w-1/2">
                                            <Input
                                                id="surcharge_rate"
                                                name="surcharge_rate"
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                defaultValue={initialData?.surcharge_rate || 0}
                                                className="rounded-xl border-slate-200 font-bold h-11 pr-8"
                                            />
                                            <span className="absolute right-3 top-3 text-slate-400 text-xs font-bold">%</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-medium">
                                            Positivo (+) para recargo, Negativo (-) para descuento.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ROW 2: NAME + DNI (Full Width Container) */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-8 space-y-2">
                                    <Label htmlFor="name" className="text-[10px] font-black uppercase text-slate-400">Nombre Completo *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="Ej: Juan Pérez"
                                        required
                                        defaultValue={initialData?.name || ''}
                                        className="rounded-xl border-slate-200 font-bold h-11"
                                    />
                                </div>
                                <div className="md:col-span-4 space-y-2">
                                    <Label htmlFor="doc_number" className="text-[10px] font-black uppercase text-slate-400">DNI / CUIT</Label>
                                    <Input
                                        id="doc_number"
                                        name="doc_number"
                                        placeholder="Ej: 20-12345678-9"
                                        defaultValue={initialData?.doc_number || ''}
                                        className="rounded-xl border-slate-200 font-bold h-11"
                                    />
                                </div>
                            </div>

                            {/* ROW 3: PHONE + EMAIL */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-[10px] font-black uppercase text-slate-400">Teléfono / WhatsApp</Label>
                                    <div className="relative">
                                        <Phone size={14} className="absolute left-3 top-3.5 text-slate-400" />
                                        <Input
                                            id="phone"
                                            name="phone"
                                            placeholder="+54 9..."
                                            defaultValue={initialData?.phone || ''}
                                            className="rounded-xl border-slate-200 pl-9 font-bold h-11"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[10px] font-black uppercase text-slate-400">Email Principal</Label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-3 top-3.5 text-slate-400" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="juan@email.com"
                                            defaultValue={initialData?.email || ''}
                                            className="rounded-xl border-slate-200 pl-9 h-11"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN: UBICACIÓN */}
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <MapPin size={16} className="text-slate-400" />
                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Ubicación</h3>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address" className="text-[10px] font-black uppercase text-slate-400">Calle / Altura / Piso</Label>
                            <Input
                                id="address"
                                name="address"
                                placeholder="Ej: Calle San Martín 123, 4to B"
                                defaultValue={initialData?.address || ''}
                                className="rounded-xl border-slate-200 h-11"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="province" className="text-[10px] font-black uppercase text-slate-400">Provincia</Label>
                                <Input
                                    id="province"
                                    name="province"
                                    placeholder="Ej: Santa Fe"
                                    defaultValue={initialData?.province || ''}
                                    className="rounded-xl border-slate-200 h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city" className="text-[10px] font-black uppercase text-slate-400">Localidad</Label>
                                <Input
                                    id="city"
                                    name="city"
                                    placeholder="Ej: Rosario"
                                    defaultValue={initialData?.city || ''}
                                    className="rounded-xl border-slate-200 h-11"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN: CUENTA CORRIENTE */}
                    <div className="space-y-4 pt-4">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label htmlFor="is_account_active" className="text-sm font-black text-slate-800 uppercase tracking-tight">Cuenta Corriente</Label>
                                    <p className="text-[10px] text-slate-500 font-medium">Permitir que el cliente retire mercadería a crédito.</p>
                                </div>
                                <Switch
                                    id="is_account_active"
                                    name="is_account_active"
                                    defaultChecked={initialData?.has_active_account}
                                    onCheckedChange={(checked) => setShowCreditLimit(checked)}
                                    className="data-[state=checked]:bg-slate-900"
                                />
                            </div>

                            {showCreditLimit && (
                                <div className="animate-in fade-in slide-in-from-top-2 pt-2 border-t border-slate-200/60">
                                    <Label htmlFor="credit_limit" className="text-[10px] font-black uppercase text-slate-500">Límite de Crédito ($)</Label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                                        <Input
                                            id="credit_limit"
                                            name="credit_limit"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            defaultValue={initialData?.credit_limit || 0}
                                            className="rounded-xl border-slate-200 pl-7 font-black text-slate-900 h-11"
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-1 italic italic">Monto máximo de deuda permitida.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* BARRA DE ACCIONES (Standard) */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white">
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl h-12 px-6 font-bold text-[11px] uppercase tracking-wider border-slate-200 hover:bg-slate-50 text-slate-600"
                        onClick={onCancel}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[11px] tracking-widest rounded-xl h-12 px-8 flex gap-2 items-center"
                    >
                        {isPending ? (
                            <Loader2 className="animate-spin" size={16} />
                        ) : (
                            <Save size={16} />
                        )}
                        {isEditMode ? 'Actualizar Cliente' : 'Guardar Cliente'}
                    </Button>
                </div>
            </form>
        </>
    )
}
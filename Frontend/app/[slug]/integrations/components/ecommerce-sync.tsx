'use client'

import React, { useState } from 'react'
import { ShoppingBag, Globe, Save, RefreshCw, Link2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from 'sonner'
import axios from 'axios'
import { API_URL } from '@/lib/api-config'

interface Props {
    platform: 'tiendanube' | 'wix';
    orgId?: string;
    initialConfig?: {
        store_id?: string;
        api_key?: string;
        site_id?: string;
        access_token?: string;
        is_enabled?: boolean;
    };
    onSave?: (config: any) => void;
}

export function EcommerceSync({ platform, orgId, initialConfig, onSave }: Props) {
    const isTiendaNube = platform === 'tiendanube';
    const [config, setConfig] = useState({
        storeId: isTiendaNube ? initialConfig?.store_id : initialConfig?.site_id || '',
        accessToken: isTiendaNube ? initialConfig?.access_token : initialConfig?.api_key || '',
        isEnabled: initialConfig?.is_enabled || false
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!orgId) {
            toast.error('Error: No se encontró el ID de la organización');
            return;
        }

        setIsSaving(true);
        try {
            const payload = isTiendaNube ? {
                store_id: config.storeId,
                access_token: config.accessToken,
                is_enabled: config.isEnabled
            } : {
                site_id: config.storeId,
                api_key: config.accessToken,
                is_enabled: config.isEnabled
            };

            const res = await axios.put(`${API_URL}/organizations/${orgId}/integrations`, {
                type: platform,
                config: payload
            });

            toast.success(`Configuración de ${isTiendaNube ? 'Tienda Nube' : 'Wix'} guardada`);
            if (onSave) onSave(res.data[platform]);
        } catch (error: any) {
            console.error(`Error saving ${platform} config:`, error);
            toast.error('Error al guardar la configuración');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Status KPI (Statistics Style) */}
                <Card className={cn(
                    "md:col-span-1 border-none text-white shadow-lg rounded-[2rem] overflow-hidden transition-all duration-500",
                    config.isEnabled
                        ? (isTiendaNube ? "bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-200" : "bg-gradient-to-br from-purple-600 to-indigo-700 shadow-purple-200")
                        : "bg-gradient-to-br from-slate-400 to-slate-600 shadow-slate-200"
                )}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between opacity-80 mb-4 font-bold uppercase tracking-widest text-[10px]">
                            <span>Sincronización de Stock</span>
                            {config.isEnabled ? <CheckCircle2 size={16} /> : <div className="w-4 h-4" />}
                        </div>
                        <div className="text-3xl font-black tracking-tight uppercase italic mb-1">
                            {config.isEnabled ? 'VINCULADA' : 'SIN CONEXIÓN'}
                        </div>
                        <div className="text-white/70 text-[10px] font-bold uppercase tracking-tight">
                            {config.isEnabled
                                ? `Conectado a ${isTiendaNube ? 'Tienda Nube' : 'Wix Store'}`
                                : `Configura tu ${isTiendaNube ? 'Store ID' : 'Site ID'} para comenzar`}
                        </div>

                        <div className="mt-6 flex items-center gap-3">
                            <span className="text-xs font-bold opacity-80">Estado:</span>
                            <button
                                onClick={() => setConfig({ ...config, isEnabled: !config.isEnabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.isEnabled ? 'bg-white/20' : 'bg-slate-300/30'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Form (Statistics Style) */}
                <Card className="md:col-span-2 border border-slate-100 shadow-sm bg-white overflow-hidden rounded-[2rem]">
                    <CardHeader className="border-b border-slate-50 bg-slate-50/50 p-6">
                        <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                            <Link2 size={14} className="text-slate-400" />
                            Credenciales de API
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    {isTiendaNube ? 'Store ID' : 'Site ID'}
                                </label>
                                <input
                                    type="text"
                                    placeholder={isTiendaNube ? "Ej: 123456" : "Ej: abc-123..."}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-bold text-slate-700"
                                    value={config.storeId}
                                    onChange={(e) => setConfig({ ...config, storeId: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Access Token</label>
                                <input
                                    type="password"
                                    placeholder="••••••••••••••••"
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-bold text-slate-700"
                                    value={config.accessToken}
                                    onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? 'Guardando...' : (
                                <>
                                    <Save size={16} />
                                    Vincular Tienda
                                </>
                            )}
                        </button>
                    </CardContent>
                </Card>

                {/* Info & Sync (Aesthetic standard style) */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                    <Card className="border border-slate-200 shadow-sm bg-white p-6 rounded-3xl group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                                <RefreshCw size={28} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Acción Manual</h4>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Sincronizar Catálogo</h3>
                                <button className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-tight flex items-center gap-1 group/btn mt-1">
                                    Ejecutar ahora
                                    <ArrowRight size={10} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </Card>

                    <Card className="border border-emerald-100 shadow-sm bg-emerald-50/50 p-6 rounded-3xl">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-white text-emerald-600 rounded-2xl shadow-sm shrink-0">
                                <AlertCircle size={28} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase text-emerald-600/60 tracking-widest">Importante</h4>
                                <p className="text-[11px] font-bold leading-relaxed text-emerald-900/70 uppercase">
                                    El stock se actualiza al instante en cada venta local. Los cambios de precio también se replicarán.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}

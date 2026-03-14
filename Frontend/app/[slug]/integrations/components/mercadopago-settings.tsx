'use client'

import React, { useState } from 'react'
import { CreditCard, Save, Lock, Info, ExternalLink, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from 'sonner'
import { API_URL } from '@/lib/api-config'

import axios from 'axios'

interface MercadoPagoSettingsProps {
    orgId?: string;
    initialConfig?: {
        public_key?: string;
        access_token?: string;
        is_enabled?: boolean;
    };
    onSave?: (config: any) => void;
}

export function MercadoPagoSettings({ orgId, initialConfig, onSave }: MercadoPagoSettingsProps) {
    const [config, setConfig] = useState({
        publicKey: initialConfig?.public_key || '',
        accessToken: initialConfig?.access_token || '',
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
            const res = await axios.put(`${API_URL}/organizations/${orgId}/integrations`, {
                type: 'mercadopago',
                config: {
                    public_key: config.publicKey,
                    access_token: config.accessToken,
                    is_enabled: config.isEnabled
                }
            });
            toast.success('Configuración de Mercado Pago guardada');
            if (onSave) onSave(res.data.mercadopago);
        } catch (error: any) {
            console.error('Error saving MP config:', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Status Card (Statistics Pattern) */}
                <Card className={cn(
                    "border-none shadow-xl rounded-[2rem] overflow-hidden text-white transition-all duration-500 hover:scale-[1.02]",
                    config.isEnabled ? "bg-gradient-to-br from-blue-600 to-blue-800" : "bg-gradient-to-br from-slate-500 to-slate-700"
                )}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between opacity-80 mb-4 font-bold uppercase tracking-widest text-[10px]">
                            <span>Estado de Conexión</span>
                            {config.isEnabled ? <CheckCircle2 size={16} /> : <div className="w-4 h-4" />}
                        </div>
                        <div className="text-3xl font-black tracking-tight uppercase italic mb-1">
                            {config.isEnabled ? 'ACTIVA' : 'INACTIVA'}
                        </div>
                        <div className="text-[10px] font-bold opacity-70 uppercase tracking-tight">
                            {config.isEnabled ? 'Sincronización en tiempo real' : 'Configura tus tokens para empezar'}
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

                {/* Configuration Form */}
                <Card className="md:col-span-2 border border-slate-100 shadow-sm rounded-[2rem] bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Lock size={14} />
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Credenciales de Producción</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Public Key</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="APP_USR-..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={config.publicKey}
                                        onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Token</label>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        placeholder="APP_USR-..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={config.accessToken}
                                        onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                                    />
                                </div>
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
                                    Vincular Cuenta
                                </>
                            )}
                        </button>
                    </CardContent>
                </Card>

                {/* Guide Section (Aesthetic standard style) */}
                <Card className="border border-blue-100 shadow-sm bg-blue-50/30 md:col-span-3 rounded-[2rem]">
                    <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-start gap-5">
                            <div className="p-4 bg-white text-blue-600 rounded-2xl shadow-sm shrink-0">
                                <Info size={28} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase text-blue-600/60 tracking-widest">¿Dónde obtener tus credenciales?</h4>
                                <p className="text-[11px] font-bold leading-relaxed text-blue-900/70 uppercase">
                                    Ingresa a tu Panel de Desarrolladores de Mercado Pago y copia las <span className="text-blue-600 underline underline-offset-4 decoration-blue-600/30">Credenciales de Producción</span>. No utilices credenciales de prueba.
                                </p>
                            </div>
                        </div>
                        <a
                            href="https://www.mercadopago.com.ar/developers/panel/credentials"
                            target="_blank"
                            className="whitespace-nowrap flex items-center gap-3 px-6 py-4 bg-white border border-blue-200 rounded-2xl text-[10px] font-black uppercase text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                            PANEL DE MERCADO PAGO
                            <ExternalLink size={16} />
                        </a>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}

function XCircle({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-circle"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
    )
}

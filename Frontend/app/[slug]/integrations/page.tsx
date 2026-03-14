'use client'

import React, { useState } from 'react';
import { ShoppingBag, Globe, Save, RefreshCw, Link2, AlertCircle, CheckCircle2, XCircle, ArrowRight, CreditCard, LayoutDashboard } from 'lucide-react'
import { useParams } from 'next/navigation';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { API_URL } from '@/lib/api-config';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog"
import { MercadoPagoSettings } from './components/mercadopago-settings';
import { EcommerceSync } from './components/ecommerce-sync';

export default function IntegrationsPage() {
    const params = useParams();
    const slug = params?.slug;
    const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [organization, setOrganization] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const fetchOrg = async () => {
            if (!slug) return;
            try {
                const res = await axios.get(`${API_URL}/organizations/by-slug/${slug}`);
                setOrganization(res.data);
            } catch (err) {
                console.error('Error fetching organization:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrg();
    }, [slug]);

    const getStatus = (id: string) => {
        if (!organization?.integrations_config) return 'disconnected';
        const config = organization.integrations_config[id];
        return config?.is_enabled ? 'connected' : 'disconnected';
    };

    const integrations = [
        {
            id: 'mercadopago',
            name: 'Mercado Pago',
            description: 'Pagos online, QR y Point.',
            icon: <CreditCard className="text-blue-500" size={18} />,
            status: getStatus('mercadopago'),
            category: 'Pagos',
            component: <MercadoPagoSettings
                orgId={organization?._id}
                initialConfig={organization?.integrations_config?.mercadopago}
                onSave={(newConfig: any) => setOrganization({
                    ...organization,
                    integrations_config: { ...organization.integrations_config, mercadopago: newConfig }
                })}
            />
        },
        {
            id: 'tiendanube',
            name: 'Tienda Nube',
            description: 'Tu tienda sincronizada.',
            icon: <ShoppingBag className="text-blue-600" size={18} />,
            status: getStatus('tiendanube'),
            category: 'E-commerce',
            component: <EcommerceSync
                platform="tiendanube"
                orgId={organization?._id}
                initialConfig={organization?.integrations_config?.tiendanube}
                onSave={(newConfig: any) => setOrganization({
                    ...organization,
                    integrations_config: { ...organization.integrations_config, tiendanube: newConfig }
                })}
            />
        },
        {
            id: 'wix',
            name: 'Wix',
            description: 'Conecta tu catálogo Wix.',
            icon: <Globe className="text-purple-500" size={18} />,
            status: getStatus('wix'),
            category: 'E-commerce',
            component: <EcommerceSync
                platform="wix"
                orgId={organization?._id}
                initialConfig={organization?.integrations_config?.wix}
                onSave={(newConfig: any) => setOrganization({
                    ...organization,
                    integrations_config: { ...organization.integrations_config, wix: newConfig }
                })}
            />
        },
        {
            id: 'custom-web',
            name: 'Web Personalizada',
            description: '¿Te interesa una tienda propia? Creamos tu web 100% integrada a MULTI SAS y sin comisiones.',
            icon: <LayoutDashboard className="text-indigo-500" size={18} />,
            status: 'connected',
            category: 'Servicio',
            isPromo: true,
            buttonText: 'Consultar Plan'
        }
    ].filter(i => {
        if (i.isPromo) return true;
        return !organization?.settings?.disabled_tabs?.includes(i.id);
    });

    const handleAction = (integration: any) => {
        if (integration.isPromo) {
            window.open('https://multi-sas.com/servicios/web', '_blank');
            return;
        }
        setSelectedIntegration(integration);
        setIsModalOpen(true);
    };

    if (loading) {
        return <div className="p-12 text-center text-slate-500 animate-pulse font-bold uppercase tracking-widest text-xs">Cargando integraciones...</div>;
    }

    return (
        <div className="p-6 max-w-none mx-auto space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    Integraciones
                </h1>
                <p className="text-slate-500 text-sm font-medium">Conecta tu negocio con el mundo digital.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {integrations.map((integration) => (
                    <IntegrationCard
                        key={integration.id}
                        integration={integration}
                        onAction={() => handleAction(integration)}
                    />
                ))}
            </div>

            {/* Modal de Configuración: Estilo Estandarizado del Sistema */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-5xl bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden h-[90vh] flex flex-col">
                    <DialogHeader className="bg-slate-50 p-8 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-600 border border-slate-200/50">
                                {selectedIntegration?.icon}
                            </div>
                            <div className="space-y-1 text-left">
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
                                    {selectedIntegration?.name}
                                </DialogTitle>
                                <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Configuración y sincronización del ecosistema digital.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 p-8 pt-0 overflow-y-auto bg-white custom-scrollbar">
                        {selectedIntegration?.component}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function IntegrationCard({ integration, onAction }: { integration: any, onAction: () => void }) {
    return (
        <div className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
                    {integration.icon}
                </div>
                {!integration.isPromo && (
                    <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        integration.status === 'connected' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    )}>
                        {integration.status === 'connected' ? 'Conectado' : 'Desconectado'}
                    </div>
                )}
                {integration.isPromo && (
                    <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600">
                        Nuevo
                    </div>
                )}
            </div>

            <div className="space-y-1 mb-6 flex-1">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    {integration.name}
                </h3>
                <p className="text-slate-500 text-xs font-medium leading-relaxed line-clamp-2">
                    {integration.description}
                </p>
            </div>

            <button
                onClick={onAction}
                className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    integration.isPromo
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                )}
            >
                {integration.buttonText || 'Configurar'}
                <ArrowRight size={14} />
            </button>
        </div>
    );
}

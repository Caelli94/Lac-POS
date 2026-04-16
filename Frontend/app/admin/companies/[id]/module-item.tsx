'use client'

import { useState, useTransition } from "react"
import {
    ChevronDown,
    Settings2,
    LayoutDashboard,
    Package,
    ShoppingCart,
    History,
    FileChartColumnIncreasing,
    Truck,
    Receipt,
    Users,
    Settings,
    UserCircle,
    Banknote,
    Palette,
    Blocks,
    ChartBar,
    ArrowLeftRight,
    Globe,
    Zap,
    BookOpen,
    ShieldCheck,
    CalendarDays,
    Landmark,
    Bot
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
// Reuse existing components/actions
import { FeatureToggle } from './feature-toggle'
import { InventorySettingsModal } from './inventory-settings-modal'
import { AISettingsModal } from './ai-settings-modal'
import { updateSettingsAction } from "./actions"

interface Props {
    feature: {
        code: string;
        name: string;
        description: string;
    };
    isEnabled: boolean;
    orgId: string;
    settings: any;
}

const MODULE_ICONS: Record<string, any> = {
    agenda: LayoutDashboard,
    pos: ShoppingCart,
    inventory: Package,
    customers: UserCircle,
    suppliers: Truck,
    purchases: FileChartColumnIncreasing,
    cash: Banknote,
    sales: History,
    invoices: Receipt,
    'mass-update': Zap,
    statistics: ChartBar,
    'import-export': ArrowLeftRight,
    'web-page': Globe,
    team: Users,
    personalization: Palette,
    integrations: Blocks,
    settings: Settings,
    guide: BookOpen,
    '2fa': ShieldCheck,
    appointments: CalendarDays,
    checks: Landmark,
    ai_assistant: Bot,
    commissions: Banknote
}

// Define modules that have sub-tabs
const MODULE_TABS: Record<string, { id: string, name: string }[]> = {
    commissions: [
        { id: 'history', name: 'Historial' },
        { id: 'rules', name: 'Reglas de Venta' },
        { id: 'payments', name: 'Pagos' },
    ],
    settings: [
        { id: 'general', name: 'Información General' },
        { id: 'tickets', name: 'Ticket' },
        { id: 'pos', name: 'Puntos de Venta' },
        { id: 'prices', name: 'Listas de Precios' },
        { id: 'branches', name: 'Sucursales' },
        { id: 'barcodes', name: 'Códigos de Barra' },
        { id: 'afip', name: 'Facturación ARCA' },
        { id: 'backups', name: 'Copias de Seguridad' },
    ],
    'import-export': [
        { id: 'import', name: 'Importar Datos' },
        { id: 'export', name: 'Exportar Datos' },
    ],
    'mass-update': [
        { id: 'prices', name: 'Actualización de Precios' },
        { id: 'messaging', name: 'Mensajería Masiva' },
    ],
    statistics: [
        { id: 'sales', name: 'Ventas' },
        { id: 'customers', name: 'Clientes' },
        { id: 'suppliers', name: 'Proveedores' },
        { id: 'products', name: 'Productos' },
    ],
    inventory: [
        { id: 'images', name: 'Imágenes de Producto' },
        { id: 'batch_management', name: 'Gestión de Lotes y Vencimientos' },
    ],
    customers: [
        { id: 'customer_avatar', name: 'Avatar / Foto Perfil' },
    ],
    suppliers: [
        { id: 'supplier_avatar', name: 'Logo / Foto Perfil' },
    ],
    purchases: [
        { id: 'purchases', name: 'Compras' },
        { id: 'orders', name: 'Encargues' },
    ],
    appointments: [
        { id: 'calendar', name: 'Calendario' },
        { id: 'alerts', name: 'Radar de Alertas' },
        { id: 'settings', name: 'Configuración' },
    ],
    checks: [
        { id: 'own', name: 'Cheques Propios' },
        { id: 'third_party', name: 'Cheques de Terceros' },
    ],
    integrations: [
        { id: 'mercadopago', name: 'Mercado Pago' },
        { id: 'tiendanube', name: 'Tienda Nube' },
        { id: 'wix', name: 'Wix' },
    ]
}

export function ModuleItem({ feature, isEnabled, orgId, settings }: Props) {
    const tabs = MODULE_TABS[feature.code] || []
    const isAiAssistant = feature.code === 'ai_assistant'
    const hasTabs = (!!tabs && tabs.length > 0) || isAiAssistant
    const [isExpanded, setIsExpanded] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Determine disabled tabs from settings
    // Normalize 'avatar' legacy key to new individual keys for rendering
    const rawDisabled = settings?.disabled_tabs || []
    let disabledTabs = [...rawDisabled]
    if (rawDisabled.includes('avatar')) {
        if (!disabledTabs.includes('customer_avatar')) disabledTabs.push('customer_avatar')
        if (!disabledTabs.includes('supplier_avatar')) disabledTabs.push('supplier_avatar')
    }

    const handleToggleTab = (tabId: string, enabled: boolean) => {
        startTransition(async () => {
            let currentDisabled = settings?.disabled_tabs || []

            // MIGRATION ON WRITE: If we touch settings, explode 'avatar' into specific keys
            if (currentDisabled.includes('avatar')) {
                currentDisabled = currentDisabled.filter((t: string) => t !== 'avatar')
                // Add both new keys as disabled initially (preserving the 'avatar: disabled' state)
                currentDisabled.push('customer_avatar')
                currentDisabled.push('supplier_avatar')
            }

            let newDisabled = []
            if (enabled) {
                // Enable = remove from disabled list
                newDisabled = currentDisabled.filter((t: string) => t !== tabId)
            } else {
                // Disable = add to disabled list
                // Prevent duplicates just in case
                if (!currentDisabled.includes(tabId)) {
                    newDisabled = [...currentDisabled, tabId]
                } else {
                    newDisabled = currentDisabled
                }
            }

            // Update settings object
            const newSettings = {
                ...settings,
                disabled_tabs: newDisabled
            }

            try {
                await updateSettingsAction(orgId, newSettings)
            } catch (error) {
                console.error("Failed to update tab settings", error)
                // Toast or alert could go here
            }
        })
    }

    const Icon = MODULE_ICONS[feature.code] || Package

    return (
        <div className="flex flex-col">
            <div
                className={cn(
                    "flex items-center justify-between py-4 cursor-pointer hover:bg-slate-50 transition-all rounded-xl px-4 -mx-4 bg-white border border-transparent hover:border-slate-100 hover:shadow-sm",
                    isExpanded && "bg-slate-50 border-slate-100 shadow-none"
                )}
                onClick={() => hasTabs && setIsExpanded(!isExpanded)}
            >
                {/* 1. Icon + Title + Description + Chevron - Left Aligned */}
                <div className="flex items-center gap-4 pointer-events-none w-full">
                    {/* Fixed Icon Container */}
                    <div className={cn(
                        "w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 transition-colors",
                        isEnabled && "bg-indigo-50 text-indigo-600"
                    )}>
                        <Icon size={20} />
                    </div>

                    <div className="flex flex-col items-start gap-1">
                        <h3 className="text-base font-bold text-slate-800 select-none uppercase tracking-tight">{feature.name}</h3>
                        <p className="text-xs font-medium text-slate-400 text-left">{feature.description}</p>
                    </div>

                    {/* Styled Chevron - Now next to Title */}
                    {hasTabs && (
                        <div className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-full text-slate-300 transition-all duration-200 ml-2",
                            isExpanded ? "bg-slate-200 text-slate-600 rotate-180" : "group-hover:bg-slate-100 group-hover:text-slate-500"
                        )}>
                            <ChevronDown size={16} strokeWidth={2.5} />
                        </div>
                    )}
                </div>

                {/* 2. Actions (Switch) - Right Aligned */}
                <div className="flex items-center gap-4 pl-4 shrink-0">
                    <div onClick={(e) => e.stopPropagation()}>
                        <FeatureToggle
                            organizationId={orgId}
                            featureCode={feature.code}
                            isEnabled={isEnabled}
                        />
                    </div>
                </div>
            </div>

            {/* TABS EXPANSION */}
            {hasTabs && isExpanded && isEnabled && (
                <div className="pl-[3.5rem] pr-2 py-2 animate-in slide-in-from-top-2 fade-in duration-200">
                    {/* Inventory Special Settings Button inside Dropdown */}
                    {feature.code === 'inventory' && (
                        <div className="mb-4 pl-4">
                            <InventorySettingsModal
                                organizationId={orgId}
                                initialSettings={settings}
                                trigger={
                                    <Button variant="outline" size="sm" className="w-full justify-between" onClick={(e) => e.stopPropagation()}>
                                        <span className="text-xs font-bold uppercase text-slate-500">Configuración Avanzada</span>
                                        <Settings2 size={14} className="text-slate-400" />
                                    </Button>
                                }
                            />
                        </div>
                    )}

                    {feature.code === 'ai_assistant' && (
                        <div className="mb-4 pl-4">
                            <AISettingsModal
                                organizationId={orgId}
                                initialSettings={settings}
                                trigger={
                                    <Button variant="outline" size="sm" className="w-full justify-between" onClick={(e) => e.stopPropagation()}>
                                        <span className="text-xs font-bold uppercase text-slate-500">Parámetros de IA</span>
                                        <Settings2 size={14} className="text-slate-400" />
                                    </Button>
                                }
                            />
                        </div>
                    )}

                    <div className="border-l-2 border-slate-100 pl-4 space-y-4 my-2">
                        {tabs.map((tab) => {
                            const isTabEnabled = !disabledTabs.includes(tab.id)
                            return (
                                <div key={tab.id} className="flex items-center justify-between group">
                                    <span className={cn("text-xs font-bold uppercase tracking-wider transition-colors", isTabEnabled ? "text-slate-600" : "text-slate-300")}>
                                        {tab.name}
                                    </span>
                                    <Switch
                                        checked={isTabEnabled}
                                        onCheckedChange={(val) => handleToggleTab(tab.id, val)}
                                        disabled={isPending}
                                        className={cn("scale-75 origin-right", isTabEnabled ? "bg-slate-800" : "bg-slate-200")}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <Separator className="my-2" />
        </div>
    )
}

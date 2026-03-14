'use client'

import React, { useState } from 'react'
import { organizationService } from '@/services/organizationService'
import { userService } from '@/services/userService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Sun, Moon, Palette, Save, RefreshCw, Type, Layout, Box, Bookmark, Sparkles, Trash2, X, PanelLeft, Bold, Underline, CheckSquare, MousePointerClick, User as UserIcon, Globe } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { ThemeCustomizer } from '@/components/theme-customizer'

interface ThemeConfig {
    primary_color: string;
    border_radius: string;
    shadow_intensity: string;
    shadow_color: string;
    button_shadow: string;
    text_shadow: string;
    form_shadow: string;
    typography: {
        font_family: string;
        bold?: boolean;
        underline?: boolean;
        title_font?: string;
        title_bold?: boolean;
        title_underline?: boolean;
        subtitle_font?: string;
        subtitle_bold?: boolean;
        subtitle_underline?: boolean;
        text_font?: string;
        text_bold?: boolean;
        text_underline?: boolean;
        sidebar_font?: string;
        sidebar_size?: string;
        sidebar_bold?: boolean;
        sidebar_underline?: boolean;
        title_size: string;
        subtitle_size: string;
        text_size: string;
        title_color: string;
        subtitle_color: string;
        text_color: string;
    };
    forms: {
        input_height: string;
        input_border_color: string;
        label_size: string;
    };
    buttons?: {
        border_radius?: string;
        text_transform?: string;
        font_weight?: string;
        shadow?: string;
    };
    checkboxes?: {
        size?: 'sm' | 'md' | 'lg';
        color?: string;
        tick_color?: string;
        shadow?: string;
        radius?: string;
    };
    light: {
        background: string;
        card: string;
        foreground: string;
    };
    dark: {
        background: string;
        card: string;
        foreground: string;
    };
    sidebar?: {
        light_bg?: string;
        light_border?: string;
        light_text?: string;
        light_item_hover?: string;
        light_active_bg?: string;
        light_active_text?: string;
        dark_bg?: string;
        dark_border?: string;
        dark_text?: string;
        dark_item_hover?: string;
        dark_active_bg?: string;
        dark_active_text?: string;
    };
}

interface Props {
    org: any;
    user: any;
}

export function PersonalizationForm({ org, user }: Props) {
    // Verificar permisos
    const userRole = user?.roleData;
    const canManageGlobal = user?.role === 'superadmin' || user?.role === 'admin' || userRole?.permissions?.find((p: any) => p.module === 'personalization')?.edit;
    const canView = user?.role === 'superadmin' || user?.role === 'admin' || userRole?.permissions?.find((p: any) => p.module === 'personalization')?.view;

    const defaultTheme: ThemeConfig = {
        primary_color: '#4f46e5',
        border_radius: '0.75rem',
        shadow_intensity: '0.1',
        shadow_color: '#000000',
        button_shadow: '0',
        text_shadow: '0',
        form_shadow: '0',
        typography: {
            font_family: 'Inter, system-ui, sans-serif',
            bold: false,
            underline: false,
            title_font: 'Inter, system-ui, sans-serif',
            title_bold: true,
            title_underline: false,
            subtitle_font: 'Inter, system-ui, sans-serif',
            subtitle_bold: true,
            subtitle_underline: false,
            text_font: 'Inter, system-ui, sans-serif',
            text_bold: false,
            text_underline: false,
            sidebar_font: 'Inter, system-ui, sans-serif',
            sidebar_size: '0.875rem',
            sidebar_bold: false,
            sidebar_underline: false,
            title_size: '2.25rem',
            subtitle_size: '1.25rem',
            text_size: '1rem',
            title_color: '',
            subtitle_color: '',
            text_color: ''
        },
        forms: {
            input_height: '2.5rem',
            input_border_color: '',
            label_size: '0.875rem'
        },
        buttons: {
            border_radius: '0.5rem',
            text_transform: 'uppercase',
            font_weight: '800',
            shadow: '0'
        },
        checkboxes: {
            size: 'md',
            color: '#4f46e5',
            tick_color: '#ffffff',
            shadow: '0',
            radius: '0.25rem'
        },
        light: {
            background: '#f8fafc',
            card: '#ffffff',
            foreground: '#0f172a'
        },
        dark: {
            background: '#0f172a',
            card: '#1e293b',
            foreground: '#f8fafc'
        },
        sidebar: {
            light_bg: '#ffffff',
            light_border: '#e2e8f0',
            light_text: '#475569',
            light_item_hover: '#f8fafc',
            light_active_bg: 'rgba(79, 70, 229, 0.1)',
            light_active_text: '#4f46e5',
            dark_bg: '#020617',
            dark_border: '#1e293b',
            dark_text: '#94a3b8',
            dark_item_hover: '#1e293b',
            dark_active_bg: 'rgba(129, 140, 248, 0.1)',
            dark_active_text: '#818cf8'
        }
    }

    const initialTheme = user?.settings?.theme || org.settings?.theme || defaultTheme;

    // Helper to remove empty strings so defaults can take over
    const cleanObject = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(cleanObject);

        return Object.entries(obj).reduce((acc, [key, value]) => {
            if (value === '' || value === null || value === undefined) {
                return acc;
            }
            if (typeof value === 'object') {
                const cleaned = cleanObject(value);
                if (Object.keys(cleaned).length > 0) {
                    acc[key] = cleaned;
                }
                // If object matches default structure but is empty, we might want to keep it or drop it depending on merge strategy.
                // For spread merge { ...default, ...cleaned }, dropping it is fine if default exists.
                // But simply returning cleaned is safer recursion.
                return acc;
            }
            acc[key] = value;
            return acc;
        }, {} as any);
    };

    const cleanedInitial = cleanObject(initialTheme);

    const [config, setConfig] = useState<ThemeConfig>({
        ...defaultTheme,
        ...cleanedInitial,
        typography: { ...defaultTheme.typography, ...(cleanedInitial.typography || {}) },
        forms: { ...defaultTheme.forms, ...(cleanedInitial.forms || {}) },
        sidebar: { ...defaultTheme.sidebar, ...(cleanedInitial.sidebar || {}) },
        buttons: { ...defaultTheme.buttons, ...(cleanedInitial.buttons || {}) },
        checkboxes: { ...defaultTheme.checkboxes, ...(cleanedInitial.checkboxes || {}) },
        light: { ...defaultTheme.light, ...(cleanedInitial.light || {}) },
        dark: { ...defaultTheme.dark, ...(cleanedInitial.dark || {}) }
    })


    const [loading, setLoading] = useState(false)
    const [templateName, setTemplateName] = useState('')
    const [templates, setTemplates] = useState<any[]>(() => {
        const globalTemplates = (org.settings?.theme_templates || []).map((t: any) => ({ ...t, isPersonal: false }));
        const personalTemplates = (user.settings?.theme_templates || []).map((t: any) => ({ ...t, isPersonal: true }));
        return [...globalTemplates, ...personalTemplates];
    })
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeThemeName, setActiveThemeName] = useState<string>(org.settings?.theme_name || '')
    const [isSaveOptionsOpen, setIsSaveOptionsOpen] = useState(false)
    const [saveTarget, setSaveTarget] = useState<'personal' | 'global'>(canManageGlobal ? 'global' : 'personal')

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <X className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-xl font-black uppercase text-slate-800 dark:text-white">Acceso Denegado</h3>
                <p className="text-slate-500 text-sm font-medium">No tienes permisos para visualizar este módulo de personalización.</p>
            </div>
        );
    }

    const presets = [
        {
            name: 'Estándar',
            icon: <Sparkles className="text-indigo-500" size={16} />,
            config: defaultTheme
        },
        {
            name: 'Arcoíris',
            icon: <Palette className="text-orange-500" size={16} />,
            config: {
                ...defaultTheme,
                primary_color: '#f43f5e',
                border_radius: '1rem',
                shadow_intensity: '0.15',
                shadow_color: '#fbbf24',
                button_shadow: '0.2',
                typography: {
                    ...defaultTheme.typography,
                    font_family: 'Poppins, sans-serif',
                    title_color: '#8b5cf6',
                    subtitle_color: '#ec4899',
                    text_color: '#64748b'
                },
                light: {
                    background: '#fff7ed',
                    card: '#ffffff',
                    foreground: '#1e293b'
                },
                sidebar: {
                    ...defaultTheme.sidebar,
                    light_bg: '#faf5ff',
                    light_active_bg: '#fdf2f8',
                    light_active_text: '#db2777'
                }
            }
        },
        {
            name: 'Retro',
            icon: <Layout className="text-slate-600" size={16} />,
            config: {
                ...defaultTheme,
                primary_color: '#000080',
                border_radius: '0px',
                shadow_intensity: '0',
                shadow_color: '#000000',
                button_shadow: '0',
                typography: {
                    ...defaultTheme.typography,
                    font_family: 'Arial, sans-serif',
                    title_font: 'Arial, sans-serif',
                    title_bold: true,
                    title_size: '1.5rem',
                    text_size: '0.75rem',
                },
                forms: {
                    ...defaultTheme.forms,
                    input_height: '2rem',
                    input_border_color: '#808080'
                },
                light: {
                    background: '#c0c0c0',
                    card: '#c0c0c0',
                    foreground: '#000000'
                },
                sidebar: {
                    ...defaultTheme.sidebar,
                    light_bg: '#c0c0c0',
                    light_border: '#ffffff',
                    light_text: '#000000',
                    light_active_bg: '#000080',
                    light_active_text: '#ffffff'
                }
            }
        },
        {
            name: 'Creativo Vibrante',
            icon: <Palette className="text-pink-500" size={16} />,
            config: {
                ...defaultTheme,
                primary_color: '#db2777',
                border_radius: '1.25rem',
                shadow_intensity: '0.2',
                typography: {
                    ...defaultTheme.typography,
                    font_family: 'Poppins, sans-serif',
                    title_font: 'Poppins, sans-serif',
                    title_bold: true
                },
                light: { background: '#fff1f2', card: '#ffffff', foreground: '#881337' }
            }
        }
    ]

    const fontOptions = [
        { label: 'Inter (Moderno)', value: 'Inter, system-ui, sans-serif' },
        { label: 'Roboto (Clásico)', value: 'Roboto, sans-serif' },
        { label: 'Poppins (Redondo)', value: 'Poppins, sans-serif' },
        { label: 'Montserrat (Elegante)', value: 'Montserrat, sans-serif' },
        { label: 'Playfair (Sofisticado)', value: "'Playfair Display', serif" },
        { label: 'Open Sans (Limpieza)', value: "'Open Sans', sans-serif" },
        { label: 'Arial (Estándar)', value: 'Arial, sans-serif' },
        { label: 'Arial Black (Fuerte)', value: "'Arial Black', sans-serif" },
    ]

    const isPresetSelected = presets.some(p => p.name === activeThemeName);

    const handleSave = async (customConfig?: ThemeConfig, name?: string, overwrite: boolean = false) => {
        setLoading(true)
        try {
            const finalConfig = customConfig || config;
            const finalName = name || activeThemeName;

            if (saveTarget === 'personal') {
                // GUARDADO PERSONAL
                let newTemplates = templates.filter(t => t.isPersonal).map(({ isPersonal, ...rest }) => rest);

                if (overwrite) {
                    newTemplates = newTemplates.map(t => t.name === finalName ? { ...t, config: finalConfig } : t);
                } else if (name && !presets.some(p => p.name === name)) {
                    const exists = newTemplates.some(t => t.name === name);
                    if (exists) {
                        newTemplates = newTemplates.map(t => t.name === name ? { ...t, config: finalConfig } : t);
                    } else {
                        newTemplates = [...newTemplates, { name: finalName, config: finalConfig }];
                    }
                }

                const ok = await userService.updateSettings({
                    theme: finalConfig,
                    theme_name: finalName,
                    theme_templates: newTemplates
                });

                if (ok) {
                    toast.success('Tu personalización personal ha sido guardada.');
                    // Actualizar estado local de plantillas
                    const updatedPersonal = newTemplates.map(t => ({ ...t, isPersonal: true }));
                    const globalTemplates = templates.filter(t => !t.isPersonal);
                    setTemplates([...globalTemplates, ...updatedPersonal]);
                    setIsSaveOptionsOpen(false);
                    setTimeout(() => window.location.reload(), 800);
                } else {
                    toast.error('Error al guardar ajustes personales');
                }
            } else {
                // GUARDADO GLOBAL (ORG)
                let orgTemplates = templates.filter(t => !t.isPersonal).map(({ isPersonal, ...rest }) => rest);

                if (overwrite) {
                    orgTemplates = orgTemplates.map(t => t.name === finalName ? { ...t, config: finalConfig } : t);
                } else if (name && !presets.some(p => p.name === name)) {
                    const exists = orgTemplates.some(t => t.name === name);
                    if (exists) {
                        orgTemplates = orgTemplates.map(t => t.name === name ? { ...t, config: finalConfig } : t);
                    } else {
                        orgTemplates = [...orgTemplates, { name: finalName, config: finalConfig }];
                    }
                }

                const newSettings = {
                    ...org.settings,
                    theme: finalConfig,
                    theme_name: finalName,
                    theme_templates: orgTemplates
                }

                const ok = await organizationService.update(org._id || org.id, { settings: newSettings })
                if (ok) {
                    toast.success('Personalización global actualizada correctamente.');
                    // Actualizar estado local
                    const updatedGlobal = orgTemplates.map(t => ({ ...t, isPersonal: false }));
                    const personalTemplates = templates.filter(t => t.isPersonal);
                    setTemplates([...updatedGlobal, ...personalTemplates]);
                    setActiveThemeName(finalName);
                    setIsSaveOptionsOpen(false);
                    setTimeout(() => window.location.reload(), 800)
                } else {
                    toast.error('Error al guardar ajustes globales');
                }
            }
        } catch (error) {
            toast.error('Error de servidor al guardar');
        } finally {
            setLoading(false)
        }
    }

    const saveTemplate = async () => {
        if (!templateName) return toast.error('Ingresa un nombre para la plantilla');
        await handleSave(config, templateName, false);
        setTemplateName('');
        setIsModalOpen(false);
    }

    const deleteTemplate = async (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        const templateToDelete = templates[index];
        const newTemplates = templates.filter((_, i) => i !== index);

        if (templateToDelete.isPersonal) {
            const personalOnly = newTemplates.filter(t => t.isPersonal).map(({ isPersonal, ...rest }) => rest);
            await userService.updateSettings({ theme_templates: personalOnly });
        } else {
            const globalOnly = newTemplates.filter(t => !t.isPersonal).map(({ isPersonal, ...rest }) => rest);
            const newSettings = { ...org.settings, theme_templates: globalOnly };
            await organizationService.update(org._id || org.id, { settings: newSettings });
        }

        setTemplates(newTemplates);
        toast.info('Plantilla eliminada');
    }

    const resetToOriginal = () => {
        setConfig({
            ...defaultTheme,
            ...cleanedInitial,
            typography: { ...defaultTheme.typography, ...(cleanedInitial.typography || {}) },
            forms: { ...defaultTheme.forms, ...(cleanedInitial.forms || {}) },
            sidebar: { ...defaultTheme.sidebar, ...(cleanedInitial.sidebar || {}) },
            buttons: { ...defaultTheme.buttons, ...(cleanedInitial.buttons || {}) },
            checkboxes: { ...defaultTheme.checkboxes, ...(cleanedInitial.checkboxes || {}) },
            light: { ...defaultTheme.light, ...(cleanedInitial.light || {}) },
            dark: { ...defaultTheme.dark, ...(cleanedInitial.dark || {}) }
        });
        toast.info('Cambios cancelados. Se restauró el diseño actual.');
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-32">
            {/* LADO IZQUIERDO: CONTROLES */}
            <div className="lg:col-span-2 space-y-12">

                {/* 1. SELECCION DE PREFABS */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-indigo-600" size={24} />
                        <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Estilos Profesionales</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {presets.map((p) => (
                            <div
                                key={p.name}
                                onClick={() => {
                                    setConfig(p.config);
                                    setActiveThemeName(p.name);
                                }}
                                className={cn(
                                    "flex items-center gap-4 p-4 border-2 rounded-2xl transition-all group text-left cursor-pointer",
                                    activeThemeName === p.name ? "bg-indigo-50/50 border-indigo-500 shadow-sm" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:shadow-md"
                                )}
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                    activeThemeName === p.name ? "bg-indigo-500 text-white" : "bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950"
                                )}>
                                    {activeThemeName === p.name ? <Sparkles size={16} /> : p.icon}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold text-slate-900 dark:text-white leading-tight">{p.name}</p>
                                        {activeThemeName === p.name && (
                                            <span className="bg-indigo-600 text-[10px] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm animate-in fade-in zoom-in duration-300">
                                                EN USO
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">ESTILO PROFESIONAL</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 2. MIS PLANTILLAS */}
                {templates.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Bookmark className="text-amber-500" size={24} />
                            <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Mis Plantillas</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {templates.map((t, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        setConfig(t.config);
                                        setActiveThemeName(t.name);
                                    }}
                                    className={cn(
                                        "flex items-center gap-4 p-4 border-2 rounded-2xl transition-all group text-left relative cursor-pointer",
                                        activeThemeName === t.name ? "bg-amber-50/50 border-amber-500 shadow-sm" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-amber-500 hover:shadow-md"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                        activeThemeName === t.name ? "bg-amber-500 text-white" : "bg-amber-50 dark:bg-amber-950 group-hover:bg-amber-100 dark:group-hover:bg-amber-900"
                                    )}>
                                        <Bookmark size={activeThemeName === t.name ? 14 : 16} />
                                    </div>
                                    <div className="pr-8 flex-grow">
                                        <div className="flex items-center gap-2 mb-1">
                                            {t.isPersonal ? <UserIcon size={12} className="text-amber-600" /> : <Globe size={12} className="text-amber-600" />}
                                            <p className="font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">{t.name}</p>
                                            {activeThemeName === t.name && (
                                                <span className="bg-amber-500 text-[10px] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm animate-in fade-in zoom-in duration-300 shrink-0">
                                                    EN USO
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 font-mono">
                                            <span className={cn(
                                                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0",
                                                t.isPersonal ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-600"
                                            )}>
                                                {t.isPersonal ? 'MÍO' : 'ORG'}
                                            </span>
                                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">PLANTILLA GUARDADA</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                        onClick={(e) => deleteTemplate(e, idx)}
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <div className="h-px bg-slate-200 dark:bg-slate-800 w-full" />

                {/* 3. PERSONALIZACION MANUAL */}
                <div className="space-y-10">
                    <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2 text-slate-900 dark:text-white">
                        <Palette className="text-indigo-600" size={28} /> Personalización Manual
                    </h2>

                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Palette size={16} /> Esquema de Colores del Sistema
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-8">
                                <Tabs defaultValue="light" className="w-full">
                                    <TabsList className="mb-6 w-full justify-start h-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl overflow-x-auto">
                                        <TabsTrigger value="light" className="rounded-xl px-8 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all font-black text-[10px] tracking-widest uppercase group flex gap-2">
                                            <Sun size={16} className="group-data-[state=active]:scale-110 transition-transform" /> MODO CLARO
                                        </TabsTrigger>
                                        <TabsTrigger value="dark" className="rounded-xl px-8 py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all font-black text-[10px] tracking-widest uppercase group flex gap-2">
                                            <Moon size={16} className="group-data-[state=active]:scale-110 transition-transform" /> MODO OSCURO
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="light" className="mt-6 space-y-0">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Fondo de la Aplicación</Label>
                                                <div className="flex gap-4 items-center">
                                                    <Input type="color" className="w-14 h-14 p-1 rounded-2xl border-slate-200 cursor-pointer" value={config.light.background} onChange={(e) => setConfig({ ...config, light: { ...config.light, background: e.target.value } })} />
                                                    <div className="flex-1 space-y-1">
                                                        <Input type="text" className="font-mono text-xs h-10 w-full bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 px-4 rounded-xl" value={config.light.background} onChange={(e) => setConfig({ ...config, light: { ...config.light, background: e.target.value } })} />
                                                        <p className="text-[9px] text-slate-400 font-medium px-1">HEXADECIMAL</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Fondo de Tarjetas</Label>
                                                <div className="flex gap-4 items-center">
                                                    <Input type="color" className="w-14 h-14 p-1 rounded-2xl border-slate-200 cursor-pointer" value={config.light.card} onChange={(e) => setConfig({ ...config, light: { ...config.light, card: e.target.value } })} />
                                                    <div className="flex-1 space-y-1">
                                                        <Input type="text" className="font-mono text-xs h-10 w-full bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 px-4 rounded-xl" value={config.light.card} onChange={(e) => setConfig({ ...config, light: { ...config.light, card: e.target.value } })} />
                                                        <p className="text-[9px] text-slate-400 font-medium px-1">HEXADECIMAL</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="dark" className="mt-6 space-y-0">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 shadow-sm space-y-4">
                                                <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Fondo del Sistema (OSCURO)</Label>
                                                <div className="flex gap-4 items-center">
                                                    <Input type="color" className="w-14 h-14 p-1 rounded-2xl border-slate-800 bg-slate-900 cursor-pointer" value={config.dark.background} onChange={(e) => setConfig({ ...config, dark: { ...config.dark, background: e.target.value } })} />
                                                    <div className="flex-1 space-y-1">
                                                        <Input type="text" className="font-mono text-xs h-10 w-full bg-slate-900 dark:bg-slate-950 px-4 text-slate-300 border-slate-800 rounded-xl" value={config.dark.background} onChange={(e) => setConfig({ ...config, dark: { ...config.dark, background: e.target.value } })} />
                                                        <p className="text-[9px] text-slate-500 font-medium px-1">HEXADECIMAL</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 shadow-sm space-y-4">
                                                <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Fondo de Tarjetas (OSCURO)</Label>
                                                <div className="flex gap-4 items-center">
                                                    <Input type="color" className="w-14 h-14 p-1 rounded-2xl border-slate-800 bg-slate-900 cursor-pointer" value={config.dark.card} onChange={(e) => setConfig({ ...config, dark: { ...config.dark, card: e.target.value } })} />
                                                    <div className="flex-1 space-y-1">
                                                        <Input type="text" className="font-mono text-xs h-10 w-full bg-slate-900 dark:bg-slate-950 px-4 text-slate-300 border-slate-800 rounded-xl" value={config.dark.card} onChange={(e) => setConfig({ ...config, dark: { ...config.dark, card: e.target.value } })} />
                                                        <p className="text-[9px] text-slate-500 font-medium px-1">HEXADECIMAL</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Box size={16} /> Estilo General & Sombras
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Panel 1: Estilo de Base */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest border-b border-indigo-50 dark:border-indigo-900/30 pb-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        Estilo de Base
                                    </h3>

                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Color Primario</Label>
                                            <div className="flex gap-2 items-center">
                                                <div className="relative">
                                                    <Input type="color" className="w-12 h-10 p-1 rounded-lg cursor-pointer border-slate-200" value={config.primary_color || '#6366f1'} onChange={(e) => setConfig({ ...config, primary_color: e.target.value })} />
                                                </div>
                                                <Input type="text" className="font-mono text-xs h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" value={config.primary_color || '#6366f1'} onChange={(e) => setConfig({ ...config, primary_color: e.target.value })} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Redondeado</Label>
                                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{config.border_radius || '0.5rem'}</span>
                                            </div>
                                            <Input type="range" min="0" max="2" step="0.1" className="h-4 accent-indigo-600" value={parseFloat(config.border_radius || '0.5')} onChange={(e) => setConfig({ ...config, border_radius: `${e.target.value}rem` })} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Color de Sombreado</Label>
                                            <div className="flex gap-2 items-center">
                                                <Input type="color" className="w-12 h-10 p-1 rounded-lg cursor-pointer border-slate-200" value={config.shadow_color || '#000000'} onChange={(e) => setConfig({ ...config, shadow_color: e.target.value })} />
                                                <Input type="text" className="font-mono text-xs h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" value={config.shadow_color || '#000000'} onChange={(e) => setConfig({ ...config, shadow_color: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Panel 2: Intensidad de Sombras */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest border-b border-indigo-50 dark:border-indigo-900/30 pb-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        Intensidad de Sombras
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Global / Tarjetas</Label>
                                                <span className="text-[10px] font-bold text-slate-500">{config.shadow_intensity || '0'}</span>
                                            </div>
                                            <Input type="range" min="0" max="0.5" step="0.01" className="h-4 accent-indigo-600" value={config.shadow_intensity || '0'} onChange={(e) => setConfig({ ...config, shadow_intensity: e.target.value })} />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Botones</Label>
                                                <span className="text-[10px] font-bold text-slate-500">{config.button_shadow || '0'}</span>
                                            </div>
                                            <Input type="range" min="0" max="0.5" step="0.01" className="h-4 accent-indigo-600" value={config.button_shadow || '0'} onChange={(e) => setConfig({ ...config, button_shadow: e.target.value })} />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Letras (Text)</Label>
                                                <span className="text-[10px] font-bold text-slate-500">{config.text_shadow || '0'}</span>
                                            </div>
                                            <Input type="range" min="0" max="0.5" step="0.01" className="h-4 accent-indigo-600" value={config.text_shadow || '0'} onChange={(e) => setConfig({ ...config, text_shadow: e.target.value })} />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Formularios</Label>
                                                <span className="text-[10px] font-bold text-slate-500">{config.form_shadow || '0'}</span>
                                            </div>
                                            <Input type="range" min="0" max="0.5" step="0.01" className="h-4 accent-indigo-600" value={config.form_shadow || '0'} onChange={(e) => setConfig({ ...config, form_shadow: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>



                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Type size={16} /> Tipografía & Textos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-10">
                            {/* Tipografía Global */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    Configuración Global
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-end gap-2">
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight block">Tipo de Letra Principal</Label>
                                            <Select value={config.typography.font_family} onValueChange={(val) => setConfig({ ...config, typography: { ...config.typography, font_family: val, title_font: val, subtitle_font: val, text_font: val } })}>
                                                <SelectTrigger className="h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {fontOptions.map(f => (
                                                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg h-10 shrink-0 shadow-sm">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn("h-8 w-8 font-black text-[10px]", config.typography.bold ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700" : "text-slate-400")}
                                                onClick={() => {
                                                    const newVal = !config.typography.bold;
                                                    setConfig({ ...config, typography: { ...config.typography, bold: newVal, title_bold: newVal, subtitle_bold: newVal, text_bold: newVal } });
                                                }}
                                            >
                                                N
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn("h-8 w-8 font-black text-[10px] underline", config.typography.underline ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700" : "text-slate-400")}
                                                onClick={() => {
                                                    const newVal = !config.typography.underline;
                                                    setConfig({ ...config, typography: { ...config.typography, underline: newVal, title_underline: newVal, subtitle_underline: newVal, text_underline: newVal } });
                                                }}
                                            >
                                                S
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detalles por nivel */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    Ajustes Específicos
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Títulos */}
                                    <div className="space-y-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-100 dark:hover:border-indigo-900/40">
                                        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-3">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Títulos</Label>
                                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg h-10 shrink-0 shadow-sm">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("h-8 w-8 font-black text-[10px]", (config.typography.title_bold !== undefined ? config.typography.title_bold : config.typography.bold) ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700" : "text-slate-400")}
                                                    onClick={() => setConfig({ ...config, typography: { ...config.typography, title_bold: !(config.typography.title_bold !== undefined ? config.typography.title_bold : config.typography.bold) } })}
                                                >
                                                    N
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("h-8 w-8 font-black text-[10px] underline", (config.typography.title_underline !== undefined ? config.typography.title_underline : config.typography.underline) ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700" : "text-slate-400")}
                                                    onClick={() => setConfig({ ...config, typography: { ...config.typography, title_underline: !(config.typography.title_underline !== undefined ? config.typography.title_underline : config.typography.underline) } })}
                                                >
                                                    S
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-bold uppercase text-slate-400">Fuente</Label>
                                                <Select value={config.typography.title_font || config.typography.font_family} onValueChange={(val) => setConfig({ ...config, typography: { ...config.typography, title_font: val } })}>
                                                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {fontOptions.map(f => (
                                                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-bold uppercase text-slate-400">Tamaño</Label>
                                                    <Input type="text" className="h-9 text-xs bg-slate-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800" value={config.typography.title_size || ''} onChange={(e) => setConfig({ ...config, typography: { ...config.typography, title_size: e.target.value } })} placeholder="px/rem" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-bold uppercase text-slate-400">Color</Label>
                                                    <div className="flex gap-1.5 items-center">
                                                        <Input type="color" className="w-9 h-9 p-1 rounded-md cursor-pointer border-slate-100 dark:border-slate-800" value={config.typography.title_color || '#000000'} onChange={(e) => setConfig({ ...config, typography: { ...config.typography, title_color: e.target.value } })} />
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.typography.title_color || '#000' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subtítulos */}
                                    <div className="space-y-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-100 dark:hover:border-indigo-900/40">
                                        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-3">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Subtítulos</Label>
                                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg h-10 shrink-0 shadow-sm">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("h-8 w-8 font-black text-[10px]", (config.typography.subtitle_bold !== undefined ? config.typography.subtitle_bold : config.typography.bold) ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700" : "text-slate-400")}
                                                    onClick={() => setConfig({ ...config, typography: { ...config.typography, subtitle_bold: !(config.typography.subtitle_bold !== undefined ? config.typography.subtitle_bold : config.typography.bold) } })}
                                                >
                                                    N
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("h-8 w-8 font-black text-[10px] underline", (config.typography.subtitle_underline !== undefined ? config.typography.subtitle_underline : config.typography.underline) ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700" : "text-slate-400")}
                                                    onClick={() => setConfig({ ...config, typography: { ...config.typography, subtitle_underline: !(config.typography.subtitle_underline !== undefined ? config.typography.subtitle_underline : config.typography.underline) } })}
                                                >
                                                    S
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-bold uppercase text-slate-400">Fuente</Label>
                                                <Select value={config.typography.subtitle_font || config.typography.font_family} onValueChange={(val) => setConfig({ ...config, typography: { ...config.typography, subtitle_font: val } })}>
                                                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {fontOptions.map(f => (
                                                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-bold uppercase text-slate-400">Tamaño</Label>
                                                    <Input type="text" className="h-9 text-xs bg-slate-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800" value={config.typography.subtitle_size || ''} onChange={(e) => setConfig({ ...config, typography: { ...config.typography, subtitle_size: e.target.value } })} placeholder="px/rem" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-bold uppercase text-slate-400">Color</Label>
                                                    <div className="flex gap-1.5 items-center">
                                                        <Input type="color" className="w-9 h-9 p-1 rounded-md cursor-pointer border-slate-100 dark:border-slate-800" value={config.typography.subtitle_color || '#000000'} onChange={(e) => setConfig({ ...config, typography: { ...config.typography, subtitle_color: e.target.value } })} />
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.typography.subtitle_color || '#000' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cuerpo de Texto */}
                                    <div className="space-y-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-100 dark:hover:border-indigo-900/40">
                                        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-3">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cuerpo</Label>
                                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg h-10 shrink-0 shadow-sm">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("h-8 w-8 font-black text-[10px]", (config.typography.text_bold !== undefined ? config.typography.text_bold : config.typography.bold) ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700" : "text-slate-400")}
                                                    onClick={() => setConfig({ ...config, typography: { ...config.typography, text_bold: !(config.typography.text_bold !== undefined ? config.typography.text_bold : config.typography.bold) } })}
                                                >
                                                    N
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("h-8 w-8 font-black text-[10px] underline", (config.typography.text_underline !== undefined ? config.typography.text_underline : config.typography.underline) ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700" : "text-slate-400")}
                                                    onClick={() => setConfig({ ...config, typography: { ...config.typography, text_underline: !(config.typography.text_underline !== undefined ? config.typography.text_underline : config.typography.underline) } })}
                                                >
                                                    S
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-bold uppercase text-slate-400">Fuente</Label>
                                                <Select value={config.typography.text_font || config.typography.font_family} onValueChange={(val) => setConfig({ ...config, typography: { ...config.typography, text_font: val } })}>
                                                    <SelectTrigger className="h-9 text-xs bg-slate-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {fontOptions.map(f => (
                                                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-bold uppercase text-slate-400">Tamaño</Label>
                                                    <Input type="text" className="h-9 text-xs bg-slate-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800" value={config.typography.text_size || ''} onChange={(e) => setConfig({ ...config, typography: { ...config.typography, text_size: e.target.value } })} placeholder="px/rem" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-bold uppercase text-slate-400">Color</Label>
                                                    <div className="flex gap-1.5 items-center">
                                                        <Input type="color" className="w-9 h-9 p-1 rounded-md cursor-pointer border-slate-100 dark:border-slate-800" value={config.typography.text_color || '#000000'} onChange={(e) => setConfig({ ...config, typography: { ...config.typography, text_color: e.target.value } })} />
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.typography.text_color || '#000' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>


                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <MousePointerClick size={16} /> Botones
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Estilo de Texto</Label>
                                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                            {['uppercase', 'capitalize', 'none'].map((t) => (
                                                <button
                                                    key={t}
                                                    onClick={() => setConfig({ ...config, buttons: { ...config.buttons, text_transform: t } })}
                                                    className={cn(
                                                        "flex-1 text-[10px] font-black uppercase py-1.5 rounded-md transition-all",
                                                        config.buttons?.text_transform === t ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                >
                                                    {t === 'uppercase' ? 'Mayúsculas' : t === 'capitalize' ? 'Capitalizado' : 'Normal'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Redondeado</Label>
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{config.buttons?.border_radius || '0.5rem'}</span>
                                        </div>
                                        <Input type="range" min="0" max="2" step="0.1" className="h-4 accent-indigo-600" value={parseFloat(config.buttons?.border_radius || '0.5')} onChange={(e) => setConfig({ ...config, buttons: { ...config.buttons, border_radius: `${e.target.value}rem` } })} />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Grosor de Fuente</Label>
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{config.buttons?.font_weight || '600'}</span>
                                        </div>
                                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                            {[400, 500, 600, 700, 800, 900].map((w) => (
                                                <button
                                                    key={w}
                                                    onClick={() => setConfig({ ...config, buttons: { ...config.buttons, font_weight: w.toString() } })}
                                                    className={cn(
                                                        "flex-1 text-[10px] font-black uppercase py-1.5 rounded-md transition-all",
                                                        config.buttons?.font_weight?.toString() === w.toString() ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                >
                                                    {w}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Sombra</Label>
                                            <span className="text-[10px] font-bold text-slate-500">{config.buttons?.shadow || config.button_shadow || '0'}</span>
                                        </div>
                                        <Input type="range" min="0" max="0.5" step="0.01" className="h-4 accent-indigo-600" value={config.buttons?.shadow || config.button_shadow || '0'} onChange={(e) => setConfig({ ...config, buttons: { ...config.buttons, shadow: e.target.value }, button_shadow: e.target.value })} />
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                                    <div className="absolute top-3 right-3 text-[10px] font-black uppercase text-slate-300 flex items-center gap-1">
                                        <MousePointerClick size={12} /> Live Preview
                                    </div>
                                    <div className="flex flex-col gap-4 items-center">
                                        <Button>Botón Primario</Button>
                                        <Button variant="outline">Botón Secundario</Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <CheckSquare size={16} /> Checkboxes & Selección
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Left: Controls */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Tamaño</Label>
                                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                                {['sm', 'md', 'lg'].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setConfig({ ...config, checkboxes: { ...config.checkboxes, size: s as any } })}
                                                        className={cn(
                                                            "flex-1 text-[10px] font-black uppercase py-1.5 rounded-md transition-all",
                                                            config.checkboxes?.size === s ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                                        )}
                                                    >
                                                        {s === 'sm' ? 'Pequeño' : s === 'md' ? 'Mediano' : 'Grande'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Color de Fondo</Label>
                                                <div className="flex gap-2 items-center">
                                                    <Input type="color" className="w-10 h-9 p-1 rounded-lg cursor-pointer border-slate-200" value={config.checkboxes?.color || '#4f46e5'} onChange={(e) => setConfig({ ...config, checkboxes: { ...config.checkboxes, color: e.target.value } })} />
                                                    <Input type="text" className="font-mono text-[10px] h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" value={config.checkboxes?.color || '#4f46e5'} onChange={(e) => setConfig({ ...config, checkboxes: { ...config.checkboxes, color: e.target.value } })} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Color del Tick</Label>
                                                <div className="flex gap-2 items-center">
                                                    <Input type="color" className="w-10 h-9 p-1 rounded-lg cursor-pointer border-slate-200" value={config.checkboxes?.tick_color || '#ffffff'} onChange={(e) => setConfig({ ...config, checkboxes: { ...config.checkboxes, tick_color: e.target.value } })} />
                                                    <Input type="text" className="font-mono text-[10px] h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" value={config.checkboxes?.tick_color || '#ffffff'} onChange={(e) => setConfig({ ...config, checkboxes: { ...config.checkboxes, tick_color: e.target.value } })} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Redondeado</Label>
                                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{config.checkboxes?.radius || '0.25rem'}</span>
                                            </div>
                                            <Input type="range" min="0" max="1" step="0.05" className="h-4 accent-indigo-600" value={parseFloat(config.checkboxes?.radius || '0.25')} onChange={(e) => setConfig({ ...config, checkboxes: { ...config.checkboxes, radius: `${e.target.value}rem` } })} />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Sombra</Label>
                                                <span className="text-[10px] font-bold text-slate-500">{config.checkboxes?.shadow || '0'}</span>
                                            </div>
                                            <Input type="range" min="0" max="0.5" step="0.01" className="h-4 accent-indigo-600" value={config.checkboxes?.shadow || '0'} onChange={(e) => setConfig({ ...config, checkboxes: { ...config.checkboxes, shadow: e.target.value } })} />
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Preview */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                                    <div className="absolute top-3 right-3 text-[10px] font-black uppercase text-slate-300 flex items-center gap-1">
                                        <MousePointerClick size={12} /> Live Preview
                                    </div>

                                    <div className="scale-150 flex flex-col gap-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="preview-1" checked={true} />
                                            <label htmlFor="preview-1" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                Opción Seleccionada
                                            </label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="preview-2" />
                                            <label htmlFor="preview-2" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                Opción Normal
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <PanelLeft size={16} /> Barra Lateral
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-8 space-y-8 bg-white dark:bg-slate-900">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Fuente de la Barra Lateral</Label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <Select value={config.typography.sidebar_font || config.typography.font_family} onValueChange={(val) => setConfig({ ...config, typography: { ...config.typography, sidebar_font: val } })}>
                                                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {fontOptions.map(f => (
                                                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg h-10 shrink-0 shadow-sm">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("h-8 w-8 font-black text-[10px]", (config.typography.sidebar_bold !== undefined ? config.typography.sidebar_bold : config.typography.bold) ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700" : "text-slate-400")}
                                                    onClick={() => setConfig({ ...config, typography: { ...config.typography, sidebar_bold: !(config.typography.sidebar_bold !== undefined ? config.typography.sidebar_bold : config.typography.bold) } })}
                                                >
                                                    N
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("h-8 w-8 font-black text-[10px] underline", (config.typography.sidebar_underline !== undefined ? config.typography.sidebar_underline : config.typography.underline) ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700" : "text-slate-400")}
                                                    onClick={() => setConfig({ ...config, typography: { ...config.typography, sidebar_underline: !(config.typography.sidebar_underline !== undefined ? config.typography.sidebar_underline : config.typography.underline) } })}
                                                >
                                                    S
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Tamaño de Texto</Label>
                                        <Input type="text" className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" value={config.typography.sidebar_size || ''} onChange={(e) => setConfig({ ...config, typography: { ...config.typography, sidebar_size: e.target.value } })} placeholder="ej: 0.875rem" />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <Tabs defaultValue="sidebar-light" className="w-full">
                                        <TabsList className="mb-4 w-full justify-start h-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl overflow-x-auto">
                                            <TabsTrigger
                                                value="sidebar-light"
                                                className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all font-bold text-[10px] tracking-widest uppercase group flex gap-2"
                                            >
                                                <Sun size={14} className="group-data-[state=active]:scale-110 transition-transform" />
                                                MODO CLARO
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="sidebar-dark"
                                                className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all font-bold text-[10px] tracking-widest uppercase group flex gap-2"
                                            >
                                                <Moon size={14} className="group-data-[state=active]:scale-110 transition-transform" />
                                                MODO OSCURO
                                            </TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="sidebar-light" className="pt-6 m-0">
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Fondo</Label>
                                                    <Input type="color" className="w-full h-10 p-1 rounded-lg border-slate-200 cursor-pointer" value={config.sidebar?.light_bg || '#ffffff'} onChange={(e) => setConfig({ ...config, sidebar: { ...config.sidebar!, light_bg: e.target.value } })} />
                                                </div>
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Texto</Label>
                                                    <Input type="color" className="w-full h-10 p-1 rounded-lg border-slate-200 cursor-pointer" value={config.sidebar?.light_text || '#000000'} onChange={(e) => setConfig({ ...config, sidebar: { ...config.sidebar!, light_text: e.target.value } })} />
                                                </div>
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Borde</Label>
                                                    <Input type="color" className="w-full h-10 p-1 rounded-lg border-slate-200 cursor-pointer" value={config.sidebar?.light_border || '#e2e8f0'} onChange={(e) => setConfig({ ...config, sidebar: { ...config.sidebar!, light_border: e.target.value } })} />
                                                </div>
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Activo (BG)</Label>
                                                    <Input type="color" className="w-full h-10 p-1 rounded-lg border-slate-200 cursor-pointer" value={config.sidebar?.light_active_bg || '#f1f5f9'} onChange={(e) => setConfig({ ...config, sidebar: { ...config.sidebar!, light_active_bg: e.target.value } })} />
                                                </div>
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Activo (TXT)</Label>
                                                    <Input type="color" className="w-full h-10 p-1 rounded-lg border-slate-200 cursor-pointer" value={config.sidebar?.light_active_text || '#0f172a'} onChange={(e) => setConfig({ ...config, sidebar: { ...config.sidebar!, light_active_text: e.target.value } })} />
                                                </div>
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="sidebar-dark" className="pt-6 m-0">
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Fondo</Label>
                                                    <Input type="color" className="w-full h-10 p-1 rounded-lg border-slate-800 bg-slate-900 cursor-pointer" value={config.sidebar?.dark_bg || '#020617'} onChange={(e) => setConfig({ ...config, sidebar: { ...config.sidebar!, dark_bg: e.target.value } })} />
                                                </div>
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Texto</Label>
                                                    <Input type="color" className="w-full h-10 p-1 rounded-lg border-slate-800 bg-slate-900 cursor-pointer" value={config.sidebar?.dark_text || '#f8fafc'} onChange={(e) => setConfig({ ...config, sidebar: { ...config.sidebar!, dark_text: e.target.value } })} />
                                                </div>
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Borde</Label>
                                                    <Input type="color" className="w-full h-10 p-1 rounded-lg border-slate-800 bg-slate-900 cursor-pointer" value={config.sidebar?.dark_border || '#1e293b'} onChange={(e) => setConfig({ ...config, sidebar: { ...config.sidebar!, dark_border: e.target.value } })} />
                                                </div>
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Activo (BG)</Label>
                                                    <Input type="color" className="w-full h-10 p-1 rounded-lg border-slate-800 bg-slate-900 cursor-pointer" value={config.sidebar?.dark_active_bg || '#1e293b'} onChange={(e) => setConfig({ ...config, sidebar: { ...config.sidebar!, dark_active_bg: e.target.value } })} />
                                                </div>
                                                <div className="space-y-2 text-center">
                                                    <Label className="text-[9px] font-bold text-slate-400 uppercase">Activo (TXT)</Label>
                                                    <Input type="color" className="w-full h-10 p-1 rounded-lg border-slate-800 bg-slate-900 cursor-pointer" value={config.sidebar?.dark_active_text || '#ffffff'} onChange={(e) => setConfig({ ...config, sidebar: { ...config.sidebar!, dark_active_text: e.target.value } })} />
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Layout size={16} /> Formularios
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Altura de Casillas</Label>
                                    <Input type="text" className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800" value={config.forms.input_height} onChange={(e) => setConfig({ ...config, forms: { ...config.forms, input_height: e.target.value } })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Color de Borde</Label>
                                    <div className="flex gap-3">
                                        <Input type="color" className="w-11 h-11 p-1 rounded-xl cursor-pointer border-slate-200" value={config.forms.input_border_color || '#e2e8f0'} onChange={(e) => setConfig({ ...config, forms: { ...config.forms, input_border_color: e.target.value } })} />
                                        <Input type="text" className="h-11 flex-1 font-mono text-xs bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800" value={config.forms.input_border_color} placeholder="Hex #" onChange={(e) => setConfig({ ...config, forms: { ...config.forms, input_border_color: e.target.value } })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Tamaño de Etiquetas</Label>
                                    <Input type="text" className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800" value={config.forms.label_size} onChange={(e) => setConfig({ ...config, forms: { ...config.forms, label_size: e.target.value } })} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>


                </div >
            </div >

            {/* LADO DERECHO: VISTA PREVIA (STICKY) */}
            < div className="lg:sticky lg:top-8 h-fit space-y-4" >
                <Card className="border-slate-900 border-2 overflow-hidden shadow-2xl flex flex-col h-fit">
                    <CardHeader className="bg-slate-900 text-white p-6">
                        <CardTitle className="text-xl italic font-black text-center tracking-tighter uppercase">Vista Previa</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6 flex-grow bg-white dark:bg-slate-950">
                        {/* Widget de Vista Previa con Título */}
                        <div className="pt-2">
                            {(() => {
                                const hexToRgb = (hex: string) => {
                                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
                                };
                                const rgbShadow = hexToRgb(config.shadow_color || '#000000');

                                return (
                                    <div
                                        className="p-6 space-y-5 transition-all border border-slate-100 dark:border-slate-800 relative overflow-hidden text-left"
                                        style={{
                                            fontFamily: config.typography.font_family,
                                            borderRadius: config.border_radius,
                                            backgroundColor: config.light.card,
                                            boxShadow: `0 15px 35px -12px rgba(${rgbShadow}, ${config.shadow_intensity || '0.1'})`
                                        }}
                                    >
                                        {/* Titulo para previsualizar tamaño y color */}
                                        <div style={{
                                            fontFamily: config.typography.title_font || config.typography.font_family,
                                            fontSize: config.typography.title_size,
                                            color: config.typography.title_color || config.light.foreground,
                                            fontWeight: config.typography.title_bold !== undefined ? (config.typography.title_bold ? 'bold' : 'normal') : (config.typography.bold ? 'bold' : 'normal'),
                                            textDecoration: config.typography.title_underline !== undefined ? (config.typography.title_underline ? 'underline' : 'none') : (config.typography.underline ? 'underline' : 'none'),
                                            textShadow: `0 2px 4px rgba(${rgbShadow}, ${config.text_shadow || '0'})`,
                                            lineHeight: 1.1,
                                            marginBottom: '0.5rem'
                                        }}>
                                            Título Principal
                                        </div>

                                        <h3 style={{
                                            fontFamily: config.typography.subtitle_font || config.typography.font_family,
                                            fontSize: '1.25rem',
                                            color: config.typography.subtitle_color || config.light.foreground,
                                            fontWeight: config.typography.subtitle_bold !== undefined ? (config.typography.subtitle_bold ? 'bold' : 'normal') : (config.typography.bold ? 'bold' : 'normal'),
                                            textDecoration: config.typography.subtitle_underline !== undefined ? (config.typography.subtitle_underline ? 'underline' : 'none') : (config.typography.underline ? 'underline' : 'none'),
                                            textShadow: `0 2px 4px rgba(${rgbShadow}, ${config.text_shadow || '0'})`,
                                            lineHeight: 1.1
                                        }}>Subtítulo de Ejemplo</h3>
                                        <p style={{
                                            fontFamily: config.typography.text_font || config.typography.font_family,
                                            fontSize: config.typography.text_size,
                                            color: config.typography.text_color || config.light.foreground,
                                            fontWeight: config.typography.text_bold !== undefined ? (config.typography.text_bold ? 'bold' : 'normal') : (config.typography.bold ? 'bold' : 'normal'),
                                            textDecoration: config.typography.text_underline !== undefined ? (config.typography.text_underline ? 'underline' : 'none') : (config.typography.underline ? 'underline' : 'none'),
                                            textShadow: `0 2px 4px rgba(${rgbShadow}, ${config.text_shadow || '0'})`,
                                            opacity: 0.8
                                        }}>Texto base configurable.</p>

                                        <div className="mt-4 space-y-2">
                                            <Label style={{ fontSize: config.forms.label_size, fontWeight: 700, opacity: 0.6 }}>CORREO ELECTRÓNICO (Etiqueta)</Label>
                                            <Input
                                                style={{
                                                    height: config.forms.input_height,
                                                    borderRadius: config.border_radius,
                                                    borderColor: config.forms.input_border_color,
                                                    boxShadow: `0 1px 3px rgba(${rgbShadow}, ${config.form_shadow || '0'})`
                                                }}
                                                placeholder="ejemplo@empresa.com"
                                                readOnly
                                                className="bg-white dark:bg-slate-900"
                                            />
                                            <Button
                                                className="w-full font-black uppercase text-[11px] tracking-wider mt-2 group flex items-center justify-center gap-2"
                                                style={{
                                                    backgroundColor: config.primary_color,
                                                    borderRadius: config.border_radius,
                                                    color: 'white',
                                                    boxShadow: `0 4px 12px rgba(${rgbShadow}, ${config.button_shadow || '0'})`
                                                }}
                                            >
                                                BOTÓN DE MUESTRA
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Botones de Acción */}
                        <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    className="h-12 border-slate-200 dark:border-slate-800 text-slate-500 font-black uppercase text-[9px] tracking-tight transition-all hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 hover:border-red-200 gap-1 px-1"
                                    onClick={resetToOriginal}
                                >
                                    <X size={14} />
                                    CANCELAR CAMBIOS
                                </Button>
                                <Button
                                    className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[9px] tracking-tight gap-1 shadow-md active:scale-95 transition-all px-1"
                                    onClick={() => setIsSaveOptionsOpen(true)}
                                    disabled={loading}
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                                    APLICAR AL SISTEMA
                                </Button>
                            </div>

                            {/* Guardar como plantilla debajo de los botones principales */}
                            <Button
                                variant="outline"
                                className="w-full h-11 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-tighter gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600"
                                onClick={() => {
                                    setTemplateName('');
                                    setIsModalOpen(true);
                                }}
                            >
                                <Bookmark size={14} />
                                GUARDAR DISEÑO COMO PLANTILLA
                            </Button>

                            <Dialog open={isSaveOptionsOpen} onOpenChange={setIsSaveOptionsOpen}>
                                <DialogContent className="max-w-md bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden flex flex-col">
                                    <DialogHeader className="bg-white p-6 border-b border-slate-100 shrink-0">
                                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900">
                                            {isPresetSelected ? 'Guardar como Nuevo' : 'Configuración de Guardado'}
                                        </DialogTitle>
                                    </DialogHeader>

                                    <div className="p-8 space-y-6 grow">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                                                <Layout size={14} className="text-slate-400" />
                                                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">¿Dónde aplicar los cambios?</h3>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    onClick={() => setSaveTarget('personal')}
                                                    className={cn(
                                                        "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all group",
                                                        saveTarget === 'personal'
                                                            ? "border-slate-900 bg-slate-50 text-slate-900"
                                                            : "border-slate-100 text-slate-400 hover:border-slate-200"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center mb-1 transition-colors",
                                                        saveTarget === 'personal' ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                                                    )}>
                                                        <UserIcon size={24} />
                                                    </div>
                                                    <span className="text-[11px] font-black uppercase tracking-tight">Solo para mí</span>
                                                    <p className="text-[9px] font-bold opacity-60">Uso Personal</p>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        if (!canManageGlobal) return toast.error('No tienes permisos para cambios globales');
                                                        setSaveTarget('global');
                                                    }}
                                                    className={cn(
                                                        "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all relative overflow-hidden group",
                                                        !canManageGlobal && "opacity-40 cursor-not-allowed",
                                                        saveTarget === 'global'
                                                            ? "border-slate-900 bg-slate-50 text-slate-900"
                                                            : "border-slate-100 text-slate-400 hover:border-slate-200"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center mb-1 transition-colors",
                                                        saveTarget === 'global' ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                                                    )}>
                                                        <Globe size={24} />
                                                    </div>
                                                    {!canManageGlobal && <div className="absolute top-3 right-3"><X size={14} className="text-red-500" /></div>}
                                                    <span className="text-[11px] font-black uppercase tracking-tight">Para todos</span>
                                                    <p className="text-[9px] font-bold opacity-60">Cambio Global</p>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                                                <Bookmark size={14} className="text-slate-400" />
                                                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                                    {saveTarget === 'global' ? 'Detalles Globales' : 'Detalles Personales'}
                                                </h3>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400">
                                                    Nombre de la Plantilla
                                                </Label>
                                                <Input
                                                    placeholder={saveTarget === 'global'
                                                        ? (isPresetSelected ? "Ej: Estilo Corporativo" : "Dejar vacío para sobrescribir")
                                                        : "Ej: Mi Estilo Oscuro"}
                                                    className="h-11 border-slate-200 font-bold rounded-xl"
                                                    value={templateName}
                                                    onChange={(e) => setTemplateName(e.target.value)}
                                                />
                                            </div>
                                            {saveTarget === 'personal' && (
                                                <p className="text-[9px] text-slate-400 font-bold leading-relaxed uppercase tracking-tight text-center mt-2 px-2">
                                                    Esta configuración será privada y solo aplicada a tu cuenta actual.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white">
                                        <Button
                                            variant="outline"
                                            className="rounded-xl h-12 px-6 font-bold text-[11px] uppercase tracking-wider border-slate-200 hover:bg-slate-50 text-slate-600"
                                            onClick={() => setIsSaveOptionsOpen(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            disabled={loading || (isPresetSelected && !templateName)}
                                            className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[11px] tracking-widest rounded-xl h-12 px-8 flex gap-2 items-center"
                                            onClick={() => {
                                                const finalName = templateName || (isPresetSelected ? '' : activeThemeName);
                                                if (!finalName) return toast.error('Debes ingresar un nombre');
                                                handleSave(config, finalName, false);
                                            }}
                                        >
                                            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                                            {saveTarget === 'personal' ? 'Guardar mi Tema' : 'Guardar Global'}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>

                <ThemeCustomizer config={config} />
            </div >
        </div >
    )
}

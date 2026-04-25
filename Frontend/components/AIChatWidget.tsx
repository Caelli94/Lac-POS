"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X, Bot, Sparkles, Zap, ZapOff, Activity, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { authService } from '@/services/authService';
import { API_URL } from '@/lib/api-config';
import ReactMarkdown from 'react-markdown';

import { usePathname } from 'next/navigation';

const INITIAL_MESSAGE = '¡Hola! Soy tu asistente inteligente LAC-POS. Bienvenido al centro de control. ¿En qué puedo ayudarte hoy?';

const INITIAL_OPTIONS = [
    { label: "Asesoramiento Comercial", value: "Asesoramiento Comercial", type: 'action' as const },
    { label: "Administrador", value: "Comunicarme con un Administrador", type: 'action' as const },
    { label: "Guía de Usuario", value: "Guía de Usuario", type: 'action' as const }
];

export function AIChatWidget() {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [performanceMode, setPerformanceMode] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('lac-pos-chat-messages');
            return saved ? JSON.parse(saved) : [{ role: 'bot', text: INITIAL_MESSAGE }];
        }
        return [{ role: 'bot', text: INITIAL_MESSAGE }];
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dynamicOptions, setDynamicOptions] = useState<{ label: string, value: string, type?: 'nav' | 'action' }[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('lac-pos-chat-options');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [quota, setQuota] = useState({ current: 0, max: 50 });
    const scrollRef = useRef<HTMLDivElement>(null);

    // Persistencia en sessionStorage
    useEffect(() => {
        sessionStorage.setItem('lac-pos-chat-messages', JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {
        sessionStorage.setItem('lac-pos-chat-options', JSON.stringify(dynamicOptions));
    }, [dynamicOptions]);

    // Validar visibilidad basada en permisos
    useEffect(() => {
        const checkAccess = async () => {
            try {
                // Solo validar en rutas de la app (que tienen slug) o si es admin
                if (pathname === '/login' || pathname === '/' || pathname?.startsWith('/booking/')) {
                    setIsVisible(false);
                    return;
                }

                const userData = await authService.getMe();
                console.log("DEBUG_1: userData", userData);
                if (!userData) {
                    setIsVisible(false);
                    return;
                }

                setUser(userData);

                // 1. Verificar si la organización tiene la feature habilitada
                const org = userData.organization;
                const isAiAssistantFeatureEnabled = org?.features?.find((f: any) => f.code === 'ai_assistant')?.is_enabled;
                const isOrgEnabled = org?.ai_assistant_enabled || isAiAssistantFeatureEnabled;

                console.log("DEBUG_2: org", org);
                console.log("DEBUG_3: isOrgEnabled (combined)", isOrgEnabled);

                if (!isOrgEnabled) {
                    setIsVisible(false);
                    return;
                }

                // 2. Verificar si el usuario tiene permiso de rol (o es admin de la org)
                const isSuperAdmin = userData.role === 'superadmin';
                const isOrgAdmin = userData.role === 'admin';
                const hasRolePermission = userData.roleId?.permissions?.find(
                    (p: any) => p.module === 'ai_assistant'
                )?.view;

                console.log("DEBUG_4: Checks", { isSuperAdmin, isOrgAdmin, hasRolePermission });

                if (isSuperAdmin || isOrgAdmin || hasRolePermission) {
                    console.log("DEBUG_5: ACCESS GRANTED");
                    setIsVisible(true);
                } else {
                    console.log("DEBUG_6: ACCESS DENIED");
                    setIsVisible(false);
                }
            } catch (error) {
                console.error("Error validando acceso a chatbot:", error);
                setIsVisible(false);
            }
        };

        checkAccess();
    }, [pathname]);

    const lastMessageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messages.length > 0 && lastMessageRef.current) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'bot') {
                // Si es del bot, hacemos scroll para que el inicio del mensaje sea visible
                lastMessageRef.current.scrollIntoView({ behavior: performanceMode ? 'auto' : 'smooth', block: 'start' });
            } else {
                // Si es del usuario, bajamos al fondo normal
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: performanceMode ? 'auto' : 'smooth' });
            }
        }
    }, [messages, isLoading, performanceMode]);

    const handleSend = async (overrideInput?: string) => {
        const textToSend = overrideInput || input;
        if (!textToSend.trim() || !user?.organization?._id) return;

        const userMsg = textToSend;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/chatbot/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: userMsg
                })
            });

            const data = await res.json();

            if (res.ok) {
                setMessages(prev => [...prev, { role: 'bot', text: data.response }]);
                setDynamicOptions(data.options || []);
                if (data.usage) {
                    setQuota({ current: data.usage.current_hour, max: data.usage.max_hour });
                }
            } else {
                toast.error(data.error || "Error al procesar consulta");
            }
        } catch (error) {
            toast.error("Error al conectar con el asistente");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setMessages([{ role: 'bot', text: INITIAL_MESSAGE }]);
        setDynamicOptions([]);
        setInput('');
        sessionStorage.removeItem('lac-pos-chat-messages');
        sessionStorage.removeItem('lac-pos-chat-options');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-3">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={performanceMode ? { opacity: 1, scale: 1 } : { opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: performanceMode ? 'none' : 'blur(0px)' }}
                        exit={performanceMode ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
                        className="relative w-full max-w-[calc(100vw-2rem)] sm:max-w-none"
                    >
                        {/* Efecto Glow de fondo - Desactivado en Eco Mode */}
                        {!performanceMode && (
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-2xl blur opacity-20 animate-pulse"></div>
                        )}

                        <Card className={cn(
                            "w-full sm:w-[400px] shadow-3xl flex flex-col h-[70vh] sm:h-[580px] overflow-hidden rounded-2xl",
                            performanceMode
                                ? "bg-slate-900 border-slate-700 text-slate-100"
                                : "border-slate-800 bg-slate-950/95 backdrop-blur-xl text-slate-100"
                        )}>
                            <CardHeader className={cn(
                                "flex flex-row items-center justify-between py-4 px-5 border-b border-white/5",
                                performanceMode ? "bg-slate-800" : "bg-slate-900/50"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        {!performanceMode && (
                                            <div className="absolute -inset-1 bg-cyan-500 rounded-full blur-sm opacity-50 animate-pulse"></div>
                                        )}
                                        <div className={cn(
                                            "relative p-2 rounded-xl border",
                                            performanceMode ? "bg-slate-700 border-slate-600" : "bg-slate-800 border-cyan-500/30"
                                        )}>
                                            <Activity className={cn("w-4 h-4", performanceMode ? "text-slate-400" : "text-cyan-400")} />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <CardTitle className={cn(
                                            "text-xs font-black uppercase tracking-[0.2em]",
                                            performanceMode ? "text-slate-200" : "text-cyan-400"
                                        )}>LAC-POS AI</CardTitle>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase">System Core v1.0</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={isLoading || messages.length <= 1}
                                        onClick={handleReset}
                                        title="Resetear Chat"
                                        className="text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-full w-8 h-8"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full w-8 h-8">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>

                            {/* Panel de Cuota */}
                            <div className={cn(
                                "px-5 py-3 border-b border-white/5 space-y-2",
                                performanceMode ? "bg-slate-800/50" : "bg-slate-900/30"
                            )}>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-slate-400">Consultas esta hora</span>
                                    <span className={quota.current >= quota.max ? "text-rose-500" : (performanceMode ? "text-slate-100" : "text-cyan-400")}>
                                        {quota.current} / {quota.max}
                                    </span>
                                </div>
                                <Progress value={(quota.current / quota.max) * 100} className="h-1 bg-slate-800" indicatorClassName={performanceMode ? "bg-slate-400" : "bg-gradient-to-r from-cyan-500 to-blue-500"} />
                            </div>

                            <CardContent ref={scrollRef} className={cn(
                                "flex-1 overflow-y-auto p-5 space-y-4 flex flex-col",
                                performanceMode ? "bg-slate-900" : "bg-transparent"
                            )}>
                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        ref={i === messages.length - 1 ? lastMessageRef : null}
                                        initial={performanceMode ? {} : { opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed transition-all duration-300 shadow-sm",
                                            msg.role === 'user'
                                                ? (performanceMode ? 'bg-slate-700 text-white self-end rounded-tr-none' : 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 self-end rounded-tr-none')
                                                : (performanceMode ? 'bg-slate-800 text-slate-300 self-start rounded-tl-none border border-slate-700' : 'bg-slate-800/50 border border-slate-700 text-slate-200 self-start rounded-tl-none')
                                        )}
                                    >
                                        {msg.role === 'bot' ? (
                                            <div className="prose prose-invert prose-xs max-w-none break-words">
                                                <ReactMarkdown
                                                    components={{
                                                        a: ({ node, ...props }) => (
                                                            <a
                                                                {...props}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-cyan-400 hover:text-cyan-300 font-bold underline decoration-cyan-500/30 hover:decoration-cyan-500 transition-all cursor-pointer inline-flex items-center gap-1"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ),
                                                        p: ({ children }) => <p className="m-0 leading-relaxed">{children}</p>,
                                                        strong: ({ children }) => <strong className="font-black text-cyan-200/90">{children}</strong>,
                                                        ul: ({ children }) => <ul className="list-disc ml-4 my-2 space-y-1">{children}</ul>,
                                                        li: ({ children }) => <li className="my-0.5">{children}</li>
                                                    }}
                                                >
                                                    {msg.text}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            msg.text
                                        )}
                                    </motion.div>
                                ))}

                                { /* Quick Replies (Menú) - SIEMPRE VISIBLES si no está cargando */}
                                {!isLoading && (
                                    <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        {(dynamicOptions.length > 0 ? dynamicOptions : INITIAL_OPTIONS).map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    handleSend(opt.value);
                                                    if (dynamicOptions.length > 0) setDynamicOptions([]); // Limpiar tras elegir
                                                }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm",
                                                    opt.type === 'nav'
                                                        ? (performanceMode
                                                            ? "bg-slate-700 text-slate-400 hover:bg-slate-600 border border-slate-600"
                                                            : "bg-slate-800/40 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500")
                                                        : (performanceMode
                                                            ? "bg-indigo-700 text-white hover:bg-indigo-600"
                                                            : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]")
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {isLoading && (
                                    <div className={cn(
                                        "self-start p-3 text-[10px] flex gap-2 items-center font-mono italic",
                                        performanceMode ? "text-slate-500" : "text-cyan-400/50"
                                    )}>
                                        {!performanceMode && <Sparkles className="w-3 h-3 animate-spin" />} PROCESANDO...
                                    </div>
                                )}
                            </CardContent>

                            <div className={cn(
                                "p-4 border-t border-white/5 flex flex-col gap-3",
                                performanceMode ? "bg-slate-800" : "bg-slate-900/50"
                            )}>
                                <div className="flex gap-2">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Ingresar comando de consulta..."
                                        className={cn(
                                            "bg-slate-950 border-slate-800 text-slate-200 text-xs h-10 rounded-xl transition-all placeholder:text-slate-600",
                                            !performanceMode && "focus:border-cyan-500"
                                        )}
                                        disabled={isLoading}
                                    />
                                    <Button
                                        size="icon"
                                        onClick={() => handleSend()}
                                        disabled={isLoading || !input.trim()}
                                        className={cn(
                                            "h-10 w-10 shrink-0 rounded-xl transform transition-transform active:scale-95",
                                            performanceMode
                                                ? "bg-slate-600 hover:bg-slate-500"
                                                : "bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.3)]"
                                        )}
                                    >
                                        <Send className="w-4 h-4 text-white" />
                                    </Button>
                                </div>
                                <div className="flex items-center justify-center gap-4 text-[9px] text-slate-500 uppercase font-black">
                                    <div className="flex items-center gap-1 group">
                                        <Switch checked={performanceMode} onCheckedChange={setPerformanceMode} className="scale-50 h-4" />
                                        <span className={performanceMode ? "text-slate-300" : "group-hover:text-slate-400"}>Eco Mode</span>
                                    </div>
                                    <span className="opacity-20">|</span>
                                    <span>Google Gemini 1.5 Flash</span>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* BOTÓN NEON PERSONALIZADO */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={performanceMode ? {} : { scale: 1.05 }}
                whileTap={performanceMode ? {} : { scale: 0.95 }}
                className="group relative w-16 h-16 outline-none"
            >
                {/* Resplandor externo dinámico - Desactivado en Eco Mode */}
                {!performanceMode && (
                    <div className="absolute inset-0 bg-cyan-500 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>
                )}

                {/* Cuerpo del botón */}
                <div className={cn(
                    "absolute inset-0 border-2 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center transition-all",
                    performanceMode
                        ? "bg-slate-800 border-slate-600 shadow-none"
                        : "bg-slate-900 border-slate-700/50 group-hover:border-cyan-500/50 shadow-cyan-500/10"
                )}>
                    {/* Líneas de brillo internas - Desactivadas en Eco Mode */}
                    {!performanceMode && (
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30"></div>
                    )}

                    {/* Icono de Carita Robot Neon */}
                    <svg viewBox="0 0 100 100" className={cn(
                        "w-10 h-10 z-10 transition-transform duration-500",
                        !performanceMode && "group-hover:scale-110"
                    )}>
                        {/* Cabeza */}
                        <rect x="20" y="30" width="60" height="50" rx="15" fill="none" stroke="currentColor" strokeWidth="4" className={performanceMode ? "text-slate-400" : "text-cyan-500"} />
                        {/* Orejas/Antenas */}
                        <path d="M20 40 L10 35 M80 40 L90 35" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className={performanceMode ? "text-slate-400" : "text-cyan-500"} />
                        {/* Ojos Neon */}
                        <circle cx="40" cy="50" r="4" fill="currentColor" className={cn(performanceMode ? "text-slate-400" : "text-cyan-400 shadow-[0_0_8px_#22d3ee]", !performanceMode && "animate-pulse")} />
                        <circle cx="60" cy="50" r="4" fill="currentColor" className={cn(performanceMode ? "text-slate-400" : "text-cyan-400 shadow-[0_0_8px_#22d3ee]", !performanceMode && "animate-pulse")} />
                        {/* Boca Sonrisa */}
                        <path d="M40 65 Q50 72 60 65" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={performanceMode ? "text-slate-500" : "text-fuchsia-400"} />
                        {/* Reflejo de cristal */}
                        <rect x="25" y="35" width="20" height="5" rx="2" fill="white" fillOpacity="0.1" />
                    </svg>

                    {/* Efecto de escaneo láser - Desactivado en Eco Mode */}
                    {!performanceMode && (
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400/20 animate-scan pointer-events-none"></div>
                    )}
                </div>

                <style jsx>{`
                    @keyframes scan {
                        0% { top: 0; }
                        50% { top: 100%; }
                        100% { top: 0; }
                    }
                    .animate-scan {
                        animation: scan 4s linear infinite;
                    }
                `}</style>
            </motion.button>
        </div >
    );
}

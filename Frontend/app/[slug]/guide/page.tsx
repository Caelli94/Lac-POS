
import { requireFeature } from '@/lib/guards';
import { BookOpen } from 'lucide-react';

interface PageProps {
    params: Promise<{
        slug: string
    }>
}

export default async function GuidePage({ params }: PageProps) {
    const { slug } = await params

    // 1. Check feature access
    await requireFeature(slug, 'guide');

    return (
        <div className="p-6 max-w-none mx-auto space-y-6 text-slate-900 min-h-screen bg-slate-50/50">
            <header className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                    <BookOpen size={24} />
                </div>
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        Guía y Documentación
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Manuales de usuario y recursos de ayuda.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder Content */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all group cursor-pointer">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                        <BookOpen size={24} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Primeros Pasos</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Aprende lo básico para empezar a utilizar el sistema de gestión.
                    </p>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm opacity-60">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6">
                        <BookOpen size={24} />
                    </div>
                    <h3 className="text-xl font-black text-slate-400 mb-2">Próximamente</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Más guías y tutoriales en video pronto.
                    </p>
                </div>
            </div>
        </div>
    )
}

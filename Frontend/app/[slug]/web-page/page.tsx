import { Construction } from "lucide-react";
import { requireFeature } from '@/lib/guards';

export default async function WebPagePlaceholder({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    await requireFeature(slug, 'web-page');

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <Construction size={48} />
            </div>
            <div className="space-y-2">
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Página Web</h1>
                <p className="text-slate-500 font-medium max-w-md mx-auto">
                    Este módulo está en construcción. Pronto podrás configurar tu sitio web desde aquí.
                </p>
            </div>
        </div>
    );
}

'use client'

import { useState, useEffect } from 'react'
import { upsertPriceListAction, getPriceListsAction } from './actions'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function PriceListManager({ orgId }: { orgId: string }) {
    const [lists, setLists] = useState<any[]>([])
    const [newName, setNewName] = useState('')
    const [loading, setLoading] = useState(false)

    // Carga inicial de las listas creadas
    useEffect(() => {
        getPriceListsAction(orgId).then(res => {
            if (res.success) setLists(res.data)
        })
    }, [orgId])

    const handleAdd = async () => {
        if (!newName) return
        setLoading(true)
        const res = await upsertPriceListAction(orgId, newName)
        if (res.success) {
            toast.success("Lista creada")
            setNewName('')
            // Recargar localmente
            const updated = await getPriceListsAction(orgId)
            if (updated.success) setLists(updated.data)
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div>
                <h3 className="text-lg font-black uppercase tracking-tighter">Listas de Precios</h3>
                <p className="text-xs text-slate-500 font-bold uppercase">Define los nombres de tus listas (Ej: Mayorista, Amigos)</p>
            </div>

            <div className="flex gap-2">
                <Input 
                    placeholder="NOMBRE DE LA LISTA..." 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)}
                    className="font-bold uppercase"
                />
                <Button onClick={handleAdd} disabled={loading} className="bg-primary px-6">
                    {loading ? <Loader2 className="animate-spin" /> : <Plus size={18} />}
                </Button>
            </div>

            <div className="space-y-2">
                {lists.map(list => (
                    <div key={list.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-black text-xs uppercase">{list.name}</span>
                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-destructive">
                            <Trash2 size={16} />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    )
}
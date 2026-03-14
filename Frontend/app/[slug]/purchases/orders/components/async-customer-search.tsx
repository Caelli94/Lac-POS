'use client'

import * as React from "react"
import { Check, ChevronsUpDown, User, Search, UserPlus, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { searchCustomersAction } from "../actions"
import { useDebounce } from "@/hooks/use-debounce"

// Simple debounce hook if not available, I'll inline it or assume it exists. 
// I'll inline a simple debounced effect to be safe.

interface Props {
    orgId: string
    initialCustomerId?: string | null
    initialCustomerName?: string
    onSelect: (customer: { id: string | null; name: string }) => void
    disabled?: boolean
}

export function AsyncCustomerSearch({ orgId, initialCustomerId, initialCustomerName, onSelect, disabled }: Props) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [debouncedQuery, setDebouncedQuery] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [options, setOptions] = React.useState<any[]>([])

    // Selection State
    const [selectedId, setSelectedId] = React.useState<string | null>(initialCustomerId || null)
    const [selectedName, setSelectedName] = React.useState<string>(initialCustomerName || "")

    // Debounce Effect
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query)
        }, 300)
        return () => clearTimeout(timer)
    }, [query])

    // Search Effect
    React.useEffect(() => {
        if (!debouncedQuery) {
            setOptions([])
            return
        }

        setLoading(true)
        searchCustomersAction(orgId, debouncedQuery)
            .then(res => {
                if (res.success) {
                    setOptions(res.customers)
                }
            })
            .finally(() => setLoading(false))
    }, [debouncedQuery, orgId])

    const handleSelect = (customer: any) => {
        setSelectedId(customer.id || customer._id)
        setSelectedName(customer.name)
        onSelect({ id: customer.id || customer._id, name: customer.name })
        setOpen(false)
        setQuery("")
    }

    const handleCustomSelect = () => {
        if (!query.trim()) return
        setSelectedId(null)
        setSelectedName(query.trim())
        onSelect({ id: null, name: query.trim() })
        setOpen(false)
        setQuery("") // Clear query after selection? Or keep it?
        // Usually clearing is better for next search, but maybe user wants to edit?
        // We display the selected name in the trigger, so clearing query is fine.
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedId(null)
        setSelectedName("")
        onSelect({ id: null, name: "" })
        setQuery("")
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    disabled={disabled}
                    aria-expanded={open}
                    className="w-full justify-between h-11 bg-white border-slate-200 text-slate-700 font-normal hover:bg-slate-50 hover:text-slate-900 rounded-xl px-3"
                >
                    <div className="flex items-center gap-2 truncate flex-1">
                        <User size={16} className={selectedId ? "text-indigo-600" : (selectedName ? "text-amber-600" : "text-slate-400")} />
                        {selectedName ? (
                            <span className={cn("font-bold truncate text-sm", selectedId ? "text-slate-900" : "text-amber-700")}>
                                {selectedName} {selectedId ? "" : "(Personalizado)"}
                            </span>
                        ) : (
                            <span className="text-slate-500 italic text-sm">Buscar o escribir nombre...</span>
                        )}
                    </div>
                    {selectedName && (
                        <div role="button" onClick={handleClear} className="mr-2 hover:bg-slate-200 rounded-full p-0.5 transition-colors">
                            <X size={14} className="text-slate-400" />
                        </div>
                    )}
                    <ChevronsUpDown className="ml-0 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Buscar cliente..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {loading && (
                            <div className="flex items-center justify-center p-4 text-slate-400 text-xs">
                                <Loader2 className="animate-spin mr-2 h-4 w-4" /> Buscando...
                            </div>
                        )}

                        {!loading && options.length === 0 && query && (
                            <CommandEmpty className="py-2 px-2 text-center text-sm text-slate-500">
                                <p className="mb-2">No encontrado.</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCustomSelect}
                                    className="w-full justify-start text-amber-700 border-amber-200 hover:bg-amber-50 h-9"
                                >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Usar "{query}"
                                </Button>
                            </CommandEmpty>
                        )}

                        <CommandGroup heading="Resultados">
                            {options.map((customer) => (
                                <CommandItem
                                    key={customer.id || customer._id}
                                    value={customer.name}
                                    onSelect={() => handleSelect(customer)}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-indigo-600",
                                            selectedId === (customer.id || customer._id) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-700">{customer.name}</span>
                                        {customer.tax_id && (
                                            <span className="text-[10px] text-slate-400 font-mono">{customer.tax_id}</span>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>

                        {!loading && options.length > 0 && query && (
                            <CommandGroup heading="Opciones Extra">
                                <CommandItem
                                    value="custom-name-option"
                                    onSelect={handleCustomSelect}
                                    className="cursor-pointer text-amber-700"
                                >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Usar nombre "{query}"
                                </CommandItem>
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

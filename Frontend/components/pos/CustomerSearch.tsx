"use client"

import * as React from "react"
import { Check, ChevronsUpDown, User, Search, UserMinus } from "lucide-react"
import { cn } from "@/lib/utils" // Asegúrate que esta ruta sea correcta en tu proyecto
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

type Customer = {
    id: string
    name: string
    tax_id: string | null
}

interface Props {
    customers: Customer[]
    selectedId: string | null
    onSelect: (id: string | null) => void
}

export function CustomerSearch({ customers, selectedId, onSelect }: Props) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    // Encontrar el cliente seleccionado para mostrar su nombre
    const selectedCustomer = customers.find((c) => c.id === selectedId)

    // Manual Filtering & Limiting
    // This prevents rendering 1000 items in the DOM which lags the UI.
    const filteredCustomers = React.useMemo(() => {
        if (!search) return customers.slice(0, 30); // Initial view: Top 30
        const lower = search.toLowerCase();
        return customers
            .filter(c =>
                c.name.toLowerCase().includes(lower) ||
                (c.tax_id && c.tax_id.includes(lower))
            )
            .slice(0, 30); // Search view: Top 30 matches
    }, [customers, search]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-10 bg-white border-slate-200 text-slate-700 font-normal hover:bg-slate-50 hover:text-slate-900"
                >
                    <div className="flex items-center gap-2 truncate">
                        <User size={16} className={selectedId ? "text-indigo-600" : "text-slate-400"} />
                        {selectedCustomer ? (
                            <span className="font-medium text-slate-900 truncate">
                                {selectedCustomer.name}
                            </span>
                        ) : (
                            <span className="text-slate-500 italic">Consumidor Final</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Buscar cliente..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty className="py-4 text-center text-sm text-slate-500">
                            {customers.length === 0 ? "No hay clientes cargados." : "No encontrado."}
                        </CommandEmpty>

                        <CommandGroup>
                            {/* Opción para deseleccionar (Consumidor Final) */}
                            <CommandItem
                                value="consumidor final anonymous"
                                onSelect={() => {
                                    onSelect(null)
                                    setOpen(false)
                                }}
                                className="cursor-pointer text-slate-500 italic"
                            >
                                <UserMinus className={cn("mr-2 h-4 w-4")} />
                                Consumidor Final
                                <Check
                                    className={cn(
                                        "ml-auto h-4 w-4",
                                        selectedId === null ? "opacity-100" : "opacity-0"
                                    )}
                                />
                            </CommandItem>

                            {/* Lista de clientes reales */}
                            {filteredCustomers.map((customer) => (
                                <CommandItem
                                    key={customer.id}
                                    value={customer.name} // Value is less relevant with manual filter but kept
                                    onSelect={() => {
                                        onSelect(customer.id)
                                        setOpen(false)
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-indigo-600",
                                            selectedId === customer.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{customer.name}</span>
                                        {customer.tax_id && (
                                            <span className="text-xs text-slate-400">{customer.tax_id}</span>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                            {filteredCustomers.length >= 10 && (
                                <div className="p-2 text-[10px] text-center text-slate-400 font-bold uppercase border-t border-slate-100">
                                    Sigue escribiendo para ver más...
                                </div>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
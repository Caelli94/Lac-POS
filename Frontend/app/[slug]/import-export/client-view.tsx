'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { downloadExcel } from '@/lib/excelUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Download, FileSpreadsheet, Package, UserCircle, Truck, Banknote, ChartBar, Loader2, FileText, X, ArrowRight, Save, Check, AlertCircle, Search, ArrowLeftRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useState, useRef } from 'react'
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { exportModuleAction, importModuleAction, getExistingIdentifiersAction } from './actions'
import { cn } from "@/lib/utils"
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const normalizeString = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const cleanId = (id: any) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
const cleanName = (name: any) => String(name || '').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();

const modules = [
    { name: 'Inventario', icon: Package, code: 'inventory', canImport: true, canExport: true },
    { name: 'Clientes', icon: UserCircle, code: 'customers', canImport: true, canExport: true },
    { name: 'Proveedores', icon: Truck, code: 'suppliers', canImport: true, canExport: true },
    { name: 'Caja', icon: Banknote, code: 'cash', canImport: false, canExport: true },
    { name: 'Estadísticas', icon: ChartBar, code: 'statistics', canImport: false, canExport: true },
]

interface Props {
    org: any;
    suppliers: any[];
    slug: string;
    branches: any[];
}

export default function ImportExportClientView({ org, suppliers, slug, branches }: Props) {
    // UI States
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedModule, setSelectedModule] = useState<any>(null)
    const [dialogStep, setDialogStep] = useState<'upload' | 'mapping' | 'preview' | 'uploading' | 'summary'>('upload')
    const [generateCodes, setGenerateCodes] = useState(true)
    const [isExporting, setIsExporting] = useState<string | null>(null)

    // Form States
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Export Config State
    const [showCashExportDialog, setShowCashExportDialog] = useState(false)
    const [exportDates, setExportDates] = useState({
        from: new Date().toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    })
    const fromRef = useRef<HTMLInputElement>(null)
    const toRef = useRef<HTMLInputElement>(null)

    const handleImportClick = (module: any) => {
        if (module.code === 'cash' || module.code === 'statistics') {
            setSelectedModule(module)
            setShowCashExportDialog(true)
            return
        }

        setSelectedModule(module)
        setSelectedSupplierId('')
        setSelectedFile(null)
        setDialogStep('upload')
        setIsDialogOpen(true)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    const handleExportClick = (moduleCode: string) => {
        if (moduleCode === 'cash' || moduleCode === 'statistics') {
            const mod = modules.find(m => m.code === moduleCode)
            setSelectedModule(mod)
            setShowCashExportDialog(true)
        } else {
            runExport(moduleCode)
        }
    }

    const runExport = async (moduleCode: string, options?: any) => {
        if (isExporting) return
        setIsExporting(moduleCode)
        toast.info("Iniciando exportación...")

        try {
            const res = await exportModuleAction(org.id, slug, moduleCode, options)

            if (res.error) {
                toast.error(res.error)
            } else {
                // Check for Multi Sheet
                if (res.sheets) {
                    const filename = res.filename.replace('.csv', '.xlsx')
                    await downloadExcel(res.sheets, filename)
                    toast.success("Exportación completada")
                    return
                }

                if (res.data) {
                    if (res.data.length === 0) {
                        toast.warning("No hay datos para exportar en este rango.")
                        return
                    }

                    // Change extension to xlsx
                    const filename = res.filename.replace('.csv', '.xlsx')
                    await downloadExcel(res.data, filename)
                    toast.success("Exportación completada")
                }
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al exportar")
        } finally {
            setIsExporting(null)
            setShowCashExportDialog(false)
        }
    }



    // Data Processing States
    const [fileColumns, setFileColumns] = useState<string[]>([])
    const [parsedData, setParsedData] = useState<any[]>([])
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
    const [previewData, setPreviewData] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isCheckingStatus, setIsCheckingStatus] = useState(false)
    const [importResults, setImportResults] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [resultsStatusFilter, setResultsStatusFilter] = useState<string>('all');


    const handlePreviewImport = async () => {
        if (!parsedData.length) return;
        setIsCheckingStatus(true);

        // Fetch existing identifiers to determine Status
        const existing = await getExistingIdentifiersAction(org.id, selectedModule.code);

        const mappedRows = parsedData.map(row => {
            const newRow: any = {};
            Object.entries(columnMapping).forEach(([fileCol, systemKey]) => {
                if (systemKey && systemKey !== 'ignore') {
                    newRow[systemKey] = row[fileCol];
                }
            });

            // Determine Status and Link ID
            let status = 'new';
            let existingId = null;

            if (existing.success) {
                const normalizedName = cleanName(newRow.name);
                const normalizedCode = cleanId(newRow.code);

                if (selectedModule.code === 'inventory') {
                    const productsList = existing.products || [];
                    const rowSku = cleanId(newRow.sku);
                    const rowBarcode = cleanId(newRow.barcode);

                    const match = productsList.find((p: any) =>
                        (normalizedCode && cleanId(p.code) === normalizedCode) ||
                        (rowSku && cleanId(p.sku) === rowSku) ||
                        (rowBarcode && cleanId(p.barcode) === rowBarcode) ||
                        (normalizedName && cleanName(p.name) === normalizedName)
                    );

                    if (match) {
                        status = 'existing';
                        existingId = match._id;
                    }
                } else if (selectedModule.code === 'customers') {
                    const customersList = existing.customers || [];
                    const rowDoc = cleanId(newRow.doc_number);

                    const match = customersList.find((c: any) =>
                        (normalizedCode && cleanId(c.code) === normalizedCode) ||
                        (rowDoc && cleanId(c.doc_number) === rowDoc) ||
                        (normalizedName && cleanName(c.name) === normalizedName)
                    );

                    if (match) {
                        status = 'existing';
                        existingId = match._id;
                    }
                } else if (selectedModule.code === 'suppliers') {
                    const suppliersList = existing.suppliers || [];
                    const rowTax = cleanId(newRow.tax_id);

                    const match = suppliersList.find((s: any) => {
                        const dbTax = cleanId(s.tax_id);
                        const dbCode = cleanId(s.code);
                        const dbName = cleanName(s.name);

                        // Match by specific Unique IDs (CUIT or Code) - Highest priority
                        if (rowTax && dbTax && rowTax === dbTax) return true;
                        if (normalizedCode && dbCode && normalizedCode === dbCode) return true;

                        // Match by Name only as a cautious fallback
                        if (normalizedName && dbName && normalizedName === dbName) return true;

                        return false;
                    });

                    if (match) {
                        status = 'existing';
                        existingId = match._id;
                        const dbTax = cleanId(match.tax_id);
                        const dbCode = cleanId(match.code);
                        newRow._matchReason = (rowTax && dbTax === rowTax) ? 'CUIT' : (normalizedCode && dbCode === normalizedCode) ? 'CÓDIGO' : 'NOMBRE';
                        newRow._existingName = match.name;
                    }
                }
            }

            newRow._status = status;
            newRow._existingId = existingId;
            return newRow;
        });

        const validRows = mappedRows.filter(r => Object.keys(r).length > 1); // > 1 because of _status
        if (validRows.length === 0) {
            toast.warning("No se seleccionaron columnas para importar.");
            setIsCheckingStatus(false);
            return;
        }

        setPreviewData(validRows);
        setDialogStep('preview');
        setIsCheckingStatus(false);
    }

    const handleConfirmImport = async () => {
        if (!previewData.length) return;
        setDialogStep('uploading');

        const toastId = toast.loading(`Importando ${previewData.length} registros... Por favor espera.`);

        try {
            const res = await importModuleAction(org.id, slug, selectedModule.code, previewData, {
                supplierId: selectedSupplierId === 'none' ? undefined : selectedSupplierId,
                generateCodes
            });

            toast.dismiss(toastId);

            if (res.success) {
                toast.success("¡Carga Finalizada Exitosamente!", { icon: <Check size={18} className="text-green-500" />, duration: 5000 });
                setImportResults({
                    ...(res.summary || { created: res.processed, updated: 0, skipped: 0 }),
                    logs: res.logs || []
                });
                setDialogStep('summary');
            } else {
                toast.error(res.message || "Error desconocido", { duration: 5000 });
                setDialogStep('mapping');
            }
        } catch (e: any) {
            toast.dismiss(toastId);
            console.error(e);
            toast.error("Error de conexión: " + e.message);
            setDialogStep('mapping');
        }
    }

    const getSystemFields = (module: string) => {
        switch (module) {
            case 'inventory':
                return [
                    { key: 'name', label: 'Nombre / Producto', aliases: ['descripcion', 'producto', 'nombre', 'articulo', 'detalle'] },
                    { key: 'sku', label: 'SKU / Código Referencia', aliases: ['code', 'codigo', 'id', 'referencia'] },
                    { key: 'barcode', label: 'Código de Barras', aliases: ['barra', 'ean', 'upc', 'barcode'] },
                    { key: 'cost', label: 'Costo de Compra', aliases: ['compra', 'base', 'costo', 'cost'] },
                    { key: 'price', label: 'Precio de Venta Final (PV)', aliases: ['final', 'venta', 'pvp', 'precio', 'price'] },
                    // Dynamic Price Lists
                    ...(org?.settings?.inventory?.price_lists || [])
                        .filter((pl: any) => pl.is_active)
                        .map((pl: any) => ({
                            key: `price_list_${pl.id || pl.name.toLowerCase().replace(/ /g, '_')}`,
                            label: `Precio: ${pl.name}`,
                            aliases: [pl.name.toLowerCase(), `precio_${pl.name.toLowerCase()}`]
                        })),
                    { key: 'stock', label: 'Stock Total', aliases: ['cantidad', 'existencia', 'stock', 'cant', 'stock total'] },
                    // Dynamic Stock by Branch
                    ...(branches || []).map((br: any) => ({
                        key: `stock_branch_${br._id || br.id}`,
                        label: `Stock: ${br.name}`,
                        aliases: [`stock ${br.name.toLowerCase()}`, `stock: ${br.name.toLowerCase()}`]
                    })),
                    // Lots feature
                    ...(org?.features?.find((f: any) => f.code === 'inventory-lots')?.is_enabled ? [
                        { key: 'lot_number', label: 'Número de Lote', aliases: ['lote', 'número de lote', 'lot'] },
                        { key: 'expiration_date', label: 'Fecha de Vencimiento', aliases: ['vencimiento', 'fecha de vencimiento', 'expiration'] }
                    ] : []),
                    { key: 'min_stock', label: 'Stock Mínimo', aliases: ['min', 'alerta'] },
                    { key: 'tax_rate', label: 'Tasa IVA %', aliases: ['iva', 'tax'] },
                    { key: 'description', label: 'Descripción Larga', aliases: ['detalle', 'obs'] }
                ];
            case 'customers':
                return [
                    { key: 'name', label: 'Nombre de Cliente', aliases: ['cliente', 'nombre', 'razon social', 'nombre cliente', 'nombre de cliente'] },
                    { key: 'code', label: 'Código Interno', aliases: ['codigo', 'id', 'nro cliente'] },
                    { key: 'doc_number', label: 'DNI / CUIT', aliases: ['dni', 'cuit', 'cuil', 'documento'] },
                    { key: 'email', label: 'Correo Electrónico', aliases: ['email', 'mail', 'correo'] },
                    { key: 'phone', label: 'Teléfono', aliases: ['tel', 'celular', 'telefono'] },
                    { key: 'address', label: 'Dirección Completa', aliases: ['direccion', 'calle', 'domicilio'] },
                    { key: 'city', label: 'Ciudad / Localidad', aliases: ['ciudad', 'localidad', 'city'] },
                    { key: 'province', label: 'Provincia / Estado', aliases: ['provincia', 'province'] },
                    { key: 'balance', label: 'Saldo Inicial (Deuda)', aliases: ['saldo', 'deuda'] },
                    { key: 'is_active_account', label: 'Cuenta Corriente', aliases: ['cuenta corriente', 'cta cte'] },
                    { key: 'credit_limit', label: 'Límite de Crédito', aliases: ['limite', 'credito', 'credit_limit'] },
                    { key: 'surcharge_rate', label: 'Recargo Fijo %', aliases: ['recargo', 'surcharge'] }
                ];
            case 'suppliers':
                return [
                    { key: 'name', label: 'Nombre de Proveedor', aliases: ['razon social', 'empresa', 'nombre proveedor', 'nombre de proveedor'] },
                    { key: 'code', label: 'Código Proveedor', aliases: ['codigo', 'id proveedor', 'codigo proveedor'] },
                    { key: 'tax_id', label: 'CUIT / Identificación', aliases: ['cuit', 'tax_id', 'identificacion'] },
                    { key: 'contact_name', label: 'Persona de Contacto (Encargado)', aliases: ['encargado', 'vendedor', 'nombre de contacto', 'contacto'] },
                    { key: 'email', label: 'Email Principal', aliases: ['email', 'mail', 'correos'] },
                    { key: 'phone', label: 'Teléfono', aliases: ['tel', 'celular', 'telefono', 'telefonos'] },
                    { key: 'address', label: 'Dirección (Calle)', aliases: ['direccion', 'calle', 'domicilio', 'direcciones'] },
                    { key: 'city', label: 'Ciudad / Localidad', aliases: ['ciudad', 'localidad'] },
                    { key: 'category', label: 'Rubros / Categorías', aliases: ['rubro', 'familia', 'categoria', 'rubros / categorias', 'rubros', 'categorias'] },
                    { key: 'web_url', label: 'Sitio Web', aliases: ['web', 'url', 'sitio web'] },
                    { key: 'instagram', label: 'Instagram (@user)', aliases: ['ig', 'instagram'] },
                    { key: 'tiktok', label: 'TikTok (@user)', aliases: ['tt', 'tiktok'] },
                    { key: 'is_active_account', label: 'Cuenta Corriente', aliases: ['cuenta corriente', 'cta cte'] },
                    { key: 'balance', label: 'Saldo Actual', aliases: ['saldo', 'deuda', 'saldo pendiente'] },
                    { key: 'credit_limit', label: 'Límite de Crédito', aliases: ['limite', 'credito', 'limite de credito'] },
                    { key: 'surcharge_rate', label: 'Bonificación / Recargo %', aliases: ['bonificacion', 'recargo', 'descuento'] }
                ];
            default: return [];
        }
    }

    const handleProcess = async () => {
        if (!selectedFile) return
        toast.info("Analizando archivo...", { duration: 2000 })

        try {
            const buffer = await selectedFile.arrayBuffer();
            const workbook = new ExcelJS.Workbook();

            // Basic XLSX load. For CSV, ExcelJS often auto-detects or needs explicit csv.read().
            // We'll try generic load. If it fails, we might need a specific CSV parser.
            // But ExcelJS is quite good.
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) throw new Error("Archivo vacío o no legible");

            const headers: string[] = [];
            const data: any[] = [];

            // Read Headers (Row 1)
            worksheet.getRow(1).eachCell((cell, colNumber) => {
                headers.push(cell.text || `Columna ${colNumber}`);
            });

            if (headers.length === 0) throw new Error("No se encontraron encabezados en la primera fila");

            // Read Data
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip Header
                const rowData: any = {};
                let hasData = false;

                headers.forEach((header, index) => {
                    const cell = row.getCell(index + 1);
                    const val = cell.text;
                    rowData[header] = val;
                    if (val) hasData = true;
                });

                if (hasData) data.push(rowData);
            });

            if (data.length === 0) throw new Error("El archivo no contiene datos (filas vacías)");

            setFileColumns(headers);
            setParsedData(data);

            // Intelligent Auto-Mapping
            const autoMap: Record<string, string> = {};
            const fields = getSystemFields(selectedModule?.code);

            // Get supplier config if available
            const supplier = suppliers.find(s => s.id === selectedSupplierId);
            const supConfig = supplier?.import_config || {};

            headers.forEach((h, idx) => {
                const lowerHeader = h.toLowerCase().trim();
                const normalizedHeader = normalizeString(h);

                // Helper to get Excel letter (A, B, C...)
                const getExcelLetter = (i: number): string => {
                    let letter = '';
                    while (i >= 0) {
                        letter = String.fromCharCode((i % 26) + 65) + letter;
                        i = Math.floor(i / 26) - 1;
                    }
                    return letter;
                };
                const letter = getExcelLetter(idx);

                // 1. Check Supplier Fixed Config (Match by name OR letter)
                const matchBySup = fields.find(f => {
                    const savedVal = supConfig[f.key]?.toLowerCase().trim();
                    if (!savedVal) return false;
                    return savedVal === lowerHeader || savedVal === letter.toLowerCase();
                });

                if (matchBySup) {
                    autoMap[h] = matchBySup.key;
                    return;
                }

                // 2. Fallback to general Alias matching
                const match = fields.find(f => {
                    // Try exact match with normalized key
                    if (normalizedHeader === normalizeString(f.key)) return true;

                    // Try alias matching
                    if (f.aliases && f.aliases.some((a: string) => {
                        const normAlias = normalizeString(a);
                        // If alias is short (<= 3 chars), require exact match to avoid false positives (like 'CC' in 'Direccion')
                        if (normAlias.length <= 3) return normalizedHeader === normAlias;
                        // For medium/long aliases (the ones from the screenshot), allow inclusion if header has it
                        return normalizedHeader === normAlias || normalizedHeader.includes(normAlias);
                    })) return true;

                    return false;
                });

                if (match) {
                    autoMap[h] = match.key;
                } else {
                    autoMap[h] = 'ignore';
                }
            });

            setColumnMapping(autoMap);
            setDialogStep('mapping');

        } catch (e: any) {
            console.error("Import Error:", e);
            toast.error("Error al leer archivo: " + (e.message || "Formato inválido"));
        }
    }

    const disabledTabs = org?.settings?.disabled_tabs || [];
    const tabsList = [
        { id: 'import', label: 'IMPORTAR DATOS', icon: Upload },
        { id: 'export', label: 'EXPORTAR DATOS', icon: Download }
    ];
    const enabledTabs = tabsList.filter(t => !disabledTabs.includes(t.id));

    if (enabledTabs.length === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6 border border-rose-100 shadow-sm">
                    <ArrowLeftRight size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Acceso Restringido</h2>
                <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium">No tienes permisos habilitados en tu rol para realizar operaciones de importación o exportación de datos.</p>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-none mx-auto space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Importar / Exportar</h1>
                <p className="text-slate-500 mt-2">Gestiona la carga masiva y descarga de tus datos.</p>
            </div>

            <Tabs defaultValue={enabledTabs[0].id} className="w-full">
                <TabsList className="mb-8 w-full justify-start h-auto p-1 bg-slate-100 rounded-2xl">
                    {enabledTabs.map(tab => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 transition-all font-bold"
                        >
                            <div className="flex items-center gap-2">
                                <tab.icon size={18} />
                                {tab.label}
                            </div>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {!disabledTabs.includes('import') && (
                    <TabsContent value="import" className="mt-0">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-slate-900">Importar Datos</CardTitle>
                                <CardDescription>Carga masiva de datos desde archivos externos.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {modules.filter(m => m.canImport).map((item) => (
                                    <div
                                        key={item.name}
                                        onClick={() => handleImportClick(item)}
                                        className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                <item.icon size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700">{item.name}</span>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-blue-400">Subir .CSV/.XLSX</span>
                                            </div>
                                        </div>
                                        <Upload size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {!disabledTabs.includes('export') && (
                    <TabsContent value="export" className="mt-0">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-slate-900">Exportar Datos</CardTitle>
                                <CardDescription>Descarga reportes completos de tu negocio.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {modules.filter(m => m.canExport).map((item) => (
                                    <div
                                        key={item.name}
                                        onClick={() => handleExportClick(item.code)}
                                        className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group active:scale-95"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                {isExporting === item.code ? <Loader2 className="animate-spin" size={20} /> : <item.icon size={20} />}
                                            </div>
                                            <span className="font-bold text-slate-700">{item.name}</span>
                                        </div>
                                        <Download size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* CASH EXPORT DIALOG */}
            <Dialog open={showCashExportDialog} onOpenChange={setShowCashExportDialog}>
                <DialogContent className="sm:max-w-[400px] p-6 rounded-3xl">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-lg font-black uppercase tracking-tight">
                            {selectedModule?.code === 'statistics' ? 'Exportar Estadísticas' : 'Exportar Cajas'}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-medium text-slate-400">
                            {selectedModule?.code === 'statistics' ? 'Selecciona el rango de análisis.' : 'Selecciona el rango de fechas.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Desde</label>
                                <input
                                    ref={fromRef}
                                    type="date"
                                    value={exportDates.from}
                                    onChange={(e) => setExportDates(prev => ({ ...prev, from: e.target.value }))}
                                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold uppercase text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Hasta</label>
                                <input
                                    ref={toRef}
                                    type="date"
                                    value={exportDates.to}
                                    onChange={(e) => setExportDates(prev => ({ ...prev, to: e.target.value }))}
                                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold uppercase text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowCashExportDialog(false)} className="rounded-xl font-bold text-slate-500">Cancelar</Button>
                        <Button size="sm" onClick={() => runExport(selectedModule?.code || 'cash', { ...exportDates, includeOpen: true })} className="rounded-xl font-bold bg-slate-900 text-white hover:bg-black">
                            <Download size={14} className="mr-2" />
                            DESCARGAR
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* IMPORT DIALOG */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className={cn(
                    "rounded-[32px] border-none shadow-2xl p-0 overflow-hidden",
                    (dialogStep === 'mapping' || dialogStep === 'preview' || dialogStep === 'summary') ? "sm:max-w-4xl" : "sm:max-w-md"
                )}>
                    {/* Header LAC Style */}
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                        <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">
                            {dialogStep === 'upload' && `Importar ${selectedModule?.name}`}
                            {dialogStep === 'mapping' && `Mapeo de Columnas`}
                            {dialogStep === 'preview' && `Previsualización de Datos`}
                            {dialogStep === 'uploading' && `Procesando...`}
                            {dialogStep === 'summary' && `Resultados de Importación`}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Formulario para importar registros al sistema LAC POS.
                        </DialogDescription>
                    </div>

                    <div className="p-8 overflow-y-auto max-h-[70vh]">
                        {/* STEP 1: UPLOAD */}
                        {dialogStep === 'upload' && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <FileText size={16} className="text-slate-400" />
                                        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Configuración de Archivo</h3>
                                    </div>

                                    {selectedModule?.code === 'inventory' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="supplier" className="text-[10px] font-black uppercase text-slate-400 ml-1">Proveedor (Perfil de Columnas)</Label>
                                            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                                                <SelectTrigger className="rounded-xl border-slate-200 h-12 font-bold">
                                                    <SelectValue placeholder="Seleccionar proveedor..." />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200">
                                                    <SelectItem value="none">-- Sin proveedor (Genérico) --</SelectItem>
                                                    {suppliers.map((s) => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Seleccionar Archivo</Label>
                                        <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} accept=".csv,.xlsx,.xls" />

                                        {!selectedFile ? (
                                            <div
                                                onClick={triggerFileInput}
                                                className="border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-blue-400 transition-all cursor-pointer group"
                                            >
                                                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                    <Upload className="h-8 w-8 text-slate-300 group-hover:text-blue-500" />
                                                </div>
                                                <span className="text-sm font-black text-slate-700 uppercase tracking-tight">Cargar .CSV o .XLSX</span>
                                                <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Arrastra o haz clic aquí</span>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                                                        <FileSpreadsheet size={24} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-800 truncate max-w-[200px] uppercase tracking-tight">{selectedFile.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{(selectedFile.size / 1024).toFixed(2)} KB</span>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} className="rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
                                                    <X size={20} />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <div
                                            className="flex items-center gap-3 cursor-pointer group"
                                            onClick={() => setGenerateCodes(!generateCodes)}
                                        >
                                            <div className={cn(
                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                generateCodes ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 bg-white group-hover:border-slate-400"
                                            )}>
                                                {generateCodes && <Check size={14} strokeWidth={4} />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Auto-generar códigos faltantes</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">Asignar el siguiente número libre automáticamente</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: MAPPING */}
                        {dialogStep === 'mapping' && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <Check size={16} className="text-slate-400" />
                                        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Mapeo de Datos</h3>
                                    </div>

                                    {selectedSupplierId && selectedSupplierId !== 'none' && (
                                        <div className="bg-blue-50/50 text-blue-700 px-5 py-4 rounded-2xl text-[11px] font-bold flex items-center gap-3 border border-blue-100 shadow-sm animate-in fade-in duration-300">
                                            <Check size={18} className="shrink-0 text-blue-500" />
                                            <p className="uppercase tracking-tight">Perfil de proveedor <b>{suppliers.find(s => s.id === selectedSupplierId)?.name}</b> detectado.</p>
                                        </div>
                                    )}

                                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                            <div className="w-1/2">Columna en Archivo</div>
                                            <div className="w-1/2 pl-4">Campo en Sistema</div>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {fileColumns.map((fileCol, index) => {
                                                const getExcelLetter = (idx: number): string => {
                                                    let letter = '';
                                                    while (idx >= 0) {
                                                        letter = String.fromCharCode((idx % 26) + 65) + letter;
                                                        idx = Math.floor(idx / 26) - 1;
                                                    }
                                                    return letter;
                                                };
                                                const letter = getExcelLetter(index);

                                                return (
                                                    <div key={index} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/30 transition-colors">
                                                        <div className="w-1/2 flex items-center gap-4">
                                                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-500 shrink-0 shadow-sm">
                                                                {letter}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700 truncate tracking-tight uppercase" title={fileCol}>
                                                                {fileCol}
                                                            </span>
                                                        </div>
                                                        <div className="w-1/2 pl-4">
                                                            <Select
                                                                value={columnMapping[fileCol] || 'ignore'}
                                                                onValueChange={(val) => setColumnMapping(prev => ({ ...prev, [fileCol]: val }))}
                                                            >
                                                                <SelectTrigger className="h-10 rounded-xl border-slate-200 font-bold bg-white focus:ring-0 focus:border-slate-400 transition-all">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-xl">
                                                                    <SelectItem value="ignore" className="text-slate-400 font-bold uppercase text-[10px]">-- Ignorar --</SelectItem>
                                                                    {getSystemFields(selectedModule?.code).map(f => (
                                                                        <SelectItem key={f.key} value={f.key} className="font-bold text-[11px] uppercase">{f.label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: PREVIEW */}
                        {dialogStep === 'preview' && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                        <ArrowRight className="text-blue-500" size={20} />
                                        Verificación de Carga ({previewData.length} Registros)
                                    </h3>

                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div className="relative group max-w-xs w-full">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="BUSCAR..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                                            />
                                        </div>

                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest bg-slate-50">
                                                <SelectValue placeholder="ESTADO" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200">
                                                <SelectItem value="all" className="font-black text-[10px] uppercase tracking-widest">TODOS</SelectItem>
                                                <SelectItem value="new" className="font-black text-[10px] uppercase tracking-widest text-green-600">NUEVOS</SelectItem>
                                                <SelectItem value="existing" className="font-black text-[10px] uppercase tracking-widest text-blue-600">EXISTENTES</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="border border-slate-100 rounded-[24px] overflow-hidden shadow-sm bg-white">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-900 text-white">
                                                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest">Nombre / Detalle</th>
                                                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest">Código Interno</th>
                                                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest">DNI / CUIT / ID</th>
                                                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-center">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {previewData
                                                    .filter(row => {
                                                        const matchesStatus = statusFilter === 'all' || row._status === statusFilter;
                                                        if (!matchesStatus) return false;

                                                        if (!searchQuery) return true;
                                                        const q = searchQuery.toLowerCase();
                                                        return (
                                                            (row.name || '').toLowerCase().includes(q) ||
                                                            (row.sku || '').toLowerCase().includes(q) ||
                                                            (row.code || '').toLowerCase().includes(q) ||
                                                            (row.doc_number || '').toLowerCase().includes(q) ||
                                                            (row.tax_id || '').toLowerCase().includes(q) ||
                                                            (row.barcode || '').toLowerCase().includes(q)
                                                        );
                                                    })
                                                    .slice(0, 50).map((row, i) => (
                                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-5 py-4 text-xs font-black text-slate-800 uppercase tracking-tight">
                                                                {row.name || 'S/N'}
                                                            </td>
                                                            <td className="px-5 py-4 text-xs font-mono font-bold text-slate-500 text-center bg-slate-50/50">{row.sku || row.code || '-'}</td>
                                                            <td className="px-5 py-4 text-xs font-bold text-slate-700 text-center">{row.doc_number || row.tax_id || row.barcode || '-'}</td>
                                                            <td className="px-5 py-4 text-center">
                                                                <Badge className={cn(
                                                                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
                                                                    row._status === 'existing' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-green-50 text-green-700 border-green-100"
                                                                )}>
                                                                    {row._status === 'existing' ? `EXISTENTE (${row._matchReason})` : 'NUEVO'}
                                                                </Badge>
                                                                {row._status === 'existing' && row._existingName && cleanName(row._existingName) !== cleanName(row.name) && (
                                                                    <div className="mt-1 text-[8px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase animate-pulse">
                                                                        CONFLICTO: SE PISARÁ A "{row._existingName}"
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                        {previewData.length > 50 && !searchQuery && (
                                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    Mostrando los primeros 50 de {previewData.length} registros. Usa el buscador para encontrar específicos.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: UPLOADING */}
                        {dialogStep === 'uploading' && (
                            <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center">
                                <div className="w-20 h-20 rounded-full border-4 border-slate-100 border-t-slate-900 animate-spin" />
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900 uppercase">Procesando Datos</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Por favor, no cierres esta ventana.</p>
                                </div>
                            </div>
                        )}

                        {/* STEP 5: SUMMARY */}
                        {dialogStep === 'summary' && (
                            <div className="space-y-8 animate-in zoom-in-95 duration-500 pt-4">
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-100 flex flex-col items-center transition-all hover:shadow-md group">
                                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <Package size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Creados</span>
                                        <span className="text-4xl font-black text-green-600 tracking-tighter">{importResults?.created || 0}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-100 flex flex-col items-center transition-all hover:shadow-md group">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <Save size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Editados</span>
                                        <span className="text-4xl font-black text-blue-600 tracking-tighter">{importResults?.updated || 0}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-100 flex flex-col items-center transition-all hover:shadow-md group">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <X size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Omitidos</span>
                                        <span className="text-4xl font-black text-slate-400 tracking-tighter">{importResults?.skipped || 0}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-slate-400" />
                                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Detalle del Procesado</h3>
                                        </div>

                                        <Select value={resultsStatusFilter} onValueChange={setResultsStatusFilter}>
                                            <SelectTrigger className="w-[140px] h-8 rounded-lg border-slate-200 font-black text-[9px] uppercase tracking-widest bg-slate-50">
                                                <SelectValue placeholder="FILTRAR ESTADO" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200">
                                                <SelectItem value="all" className="font-black text-[9px] uppercase tracking-widest">TODOS</SelectItem>
                                                <SelectItem value="created" className="font-black text-[9px] uppercase tracking-widest text-green-600">NUEVOS</SelectItem>
                                                <SelectItem value="updated" className="font-black text-[9px] uppercase tracking-widest text-blue-600">EDITADOS</SelectItem>
                                                <SelectItem value="skipped" className="font-black text-[9px] uppercase tracking-widest text-slate-500">OMITIDOS</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="border border-slate-100 rounded-[24px] overflow-hidden shadow-sm bg-white">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-400">
                                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Identificador</th>
                                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Nombre / Razón Social</th>
                                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-right">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {importResults?.logs
                                                    ?.filter((log: any) => resultsStatusFilter === 'all' || log.status === resultsStatusFilter)
                                                    ?.slice(0, 100).map((log: any, i: number) => (
                                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-6 py-4 text-xs font-mono font-bold text-slate-400">{log.id || log.code || 'S/N'}</td>
                                                            <td className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-tight">{log.name || 'Sin Nombre'}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <Badge variant="outline" className={cn(
                                                                        "font-black text-[9px] uppercase tracking-widest px-2 py-0.5",
                                                                        log.status === 'created' ? "bg-green-50 text-green-700 border-green-100" :
                                                                            log.status === 'updated' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                                                "bg-slate-100 text-slate-500 border-slate-200"
                                                                    )}>
                                                                        {log.status === 'created' ? 'NUEVO' :
                                                                            log.status === 'updated' ? 'EDITADO' :
                                                                                'OMITIDO'}
                                                                    </Badge>
                                                                    {log.reason && (
                                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{log.reason}</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                        {importResults?.logs?.length > 100 && (
                                            <div className="p-4 bg-slate-50 text-center border-t border-slate-50">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">... y {importResults.logs.length - 100} registros más</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions LAC Style */}
                    <div className="p-8 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                        {dialogStep !== 'uploading' && dialogStep !== 'summary' && (
                            <Button
                                variant="outline"
                                className="rounded-xl h-12 px-6 font-bold text-[11px] uppercase tracking-wider border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
                                onClick={() => {
                                    if (dialogStep === 'upload') setIsDialogOpen(false);
                                    if (dialogStep === 'mapping') setDialogStep('upload');
                                    if (dialogStep === 'preview') setDialogStep('mapping');
                                }}
                            >
                                {dialogStep === 'upload' ? 'Cancelar' : 'Atrás'}
                            </Button>
                        )}

                        {dialogStep === 'upload' && (
                            <Button
                                className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[11px] tracking-widest rounded-xl h-12 px-10 flex gap-2 items-center transition-all active:scale-95"
                                onClick={handleProcess}
                                disabled={!selectedFile}
                            >
                                Siguiente Paso <ArrowRight size={18} />
                            </Button>
                        )}

                        {dialogStep === 'mapping' && (
                            <Button
                                className="h-12 w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                onClick={handlePreviewImport}
                                disabled={isCheckingStatus}
                            >
                                {isCheckingStatus ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        Verificando Datos...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <ArrowRight size={16} />
                                        Siguiente: Previsualizar
                                    </div>
                                )}
                            </Button>
                        )}

                        {dialogStep === 'preview' && (
                            <Button
                                className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[11px] tracking-widest rounded-xl h-12 px-10 flex gap-2 items-center shadow-xl shadow-blue-900/10 transition-all active:scale-95 animate-pulse-subtle"
                                onClick={handleConfirmImport}
                            >
                                <Save size={18} /> CONFIRMAR E IMPORTAR
                            </Button>
                        )}

                        {dialogStep === 'summary' && (
                            <Button
                                className="h-12 w-full bg-slate-900 hover:bg-black text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                onClick={() => window.location.reload()}
                            >
                                ¡Entendido, Finalizar!
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

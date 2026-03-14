import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface InvoiceTemplateProps {
    sale: any;
    org: any;
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ sale, org }) => {
    // Helper to format currency
    const formatMoney = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

    // Helper to format date dd/mm/yyyy
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    // AFIP QR Data Generation
    const generateAfipQrBase64 = () => {
        if (!sale?.afip_data) return '';

        const afipData = {
            ver: 1,
            fecha: sale.created_at.split('T')[0], // YYYY-MM-DD
            cuit: parseInt(org.cuit?.replace(/\D/g, '') || '0'),
            ptoVta: parseInt(sale.afip_data.point_of_sale || 0),
            tipoCmp: parseInt(sale.afip_data.voucher_type || 0),
            nroCmp: parseInt(sale.afip_data.voucher_number || 0),
            importe: sale.total,
            moneda: "PES",
            ctz: 1,
            tipoDocRec: sale.document_type === 'DNI' ? 96 : (sale.document_type === 'CUIT' ? 80 : 99), // 96 DNI, 80 CUIT, 99 Consumidor Final
            nroDocRec: parseInt(sale.customer_doc ? sale.customer_doc.replace(/\D/g, '') : '00000000000'),
            tipoCodAut: "E", // E used for CAE
            codAut: parseInt(sale.afip_data.cae || 0)
        };

        const jsonString = JSON.stringify(afipData);
        return btoa(jsonString); // Encode to Base64
    };

    const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${generateAfipQrBase64()}`;

    const invoiceLetter = sale.invoice_letter || 'B';
    const invoiceCode = sale.afip_data?.voucher_type ? sale.afip_data.voucher_type.toString().padStart(3, '0') : '006'; // 006 for Factura B default

    return (
        <div className="w-[800px] h-[1123px] bg-white p-12 text-black font-sans mx-auto shadow-2xl my-8 relative" id="printable-invoice">
            {/* HEADER */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4 relative">
                {/* LETTER BOX */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center">
                    <div className="w-14 h-14 border-2 border-black flex items-center justify-center text-4xl font-bold bg-white">
                        {invoiceLetter}
                    </div>
                    <div className="text-[10px] font-bold mt-1">COD. {invoiceCode}</div>
                </div>

                {/* LEFT SIDE: COMPANY INFO */}
                <div className="w-[45%] pr-16">
                    {/* LOGO PLACEHOLDER OR ORG NAME */}
                    <div className="mb-4">
                        {org.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={org.logo_url} alt="Logo" className="h-16 object-contain" />
                        ) : (
                            <h1 className="text-2xl font-bold uppercase">{org.name}</h1>
                        )}
                    </div>
                    <div className="text-xs space-y-1">
                        <p className="font-bold">{org.name}</p>
                        <p>{org.address || 'Dirección no configurada'}</p>
                        <p>{org.city}, {org.province}</p>
                        <p className="mt-2 font-bold">Condición IVA: Responsable Inscripto</p>
                    </div>
                </div>

                {/* VERTICAL DIVIDER */}
                <div className="w-[1px] bg-black absolute left-1/2 h-full top-0"></div>

                {/* RIGHT SIDE: INVOICE INFO */}
                <div className="w-[45%] pl-8 text-right flex flex-col items-end">
                    <h2 className="text-2xl font-bold mb-4 uppercase">FACTURA</h2>
                    <div className="text-xs space-y-1 w-full">
                        <div className="flex justify-between">
                            <span className="font-bold">Punto de Venta:</span>
                            <span>{sale.afip_data?.point_of_sale?.toString().padStart(5, '0') || '00000'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-bold">Comp. Nro:</span>
                            <span>{sale.afip_data?.voucher_number?.toString().padStart(8, '0') || '00000000'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-bold">Fecha de Emisión:</span>
                            <span>{formatDate(sale.afip_data?.cbte_fch || sale.created_at)}</span>
                        </div>
                        <div className="mt-4 flex justify-between">
                            <span className="font-bold">CUIT:</span>
                            <span>{org.cuit || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-bold">Ingresos Brutos:</span>
                            <span>{org.afip_settings?.gross_income || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-bold">Inicio de Actividades:</span>
                            <span>{org.afip_settings?.start_activity_date ? formatDate(org.afip_settings.start_activity_date) : '-'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CUSTOMER INFO */}
            <div className="border border-black p-2 mb-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="font-bold mr-2">Cliente:</span>
                        <span>{sale.customer_name || 'Consumidor Final'}</span>
                    </div>
                    <div>
                        <span className="font-bold mr-2">Domicilio:</span>
                        <span>{sale.customer_address || '-'}</span>
                    </div>
                    <div>
                        <span className="font-bold mr-2">Condición IVA:</span>
                        <span>{sale.invoice_letter === 'A' ? 'Responsable Inscripto' : 'Consumidor Final'}</span>
                    </div>
                    <div>
                        <span className="font-bold mr-2">{sale.document_type || 'DNI'}:</span>
                        <span>{sale.customer_doc || '-'}</span>
                    </div>
                    <div>
                        <span className="font-bold mr-2">Condición de Venta:</span>
                        <span>{sale.payment_method}</span>
                    </div>
                </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="flex-1">
                <table className="w-full text-xs border border-black mb-4">
                    <thead className="bg-gray-200 border-b border-black">
                        <tr>
                            <th className="p-2 text-left border-r border-black w-14">Código</th>
                            <th className="p-2 text-left border-r border-black">Producto / Servicio</th>
                            <th className="p-2 text-right border-r border-black w-16">Cant.</th>
                            <th className="p-2 text-right border-r border-black w-24">Precio Unit.</th>
                            <th className="p-2 text-right border-r border-black w-16">% Bonif</th>
                            {invoiceLetter === 'A' && <th className="p-2 text-right border-r border-black w-16">IVA</th>}
                            <th className="p-2 text-right w-24">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map((item: any, idx: number) => {
                            // Assuming item.price is VAT inclusive for B, exclusive logic would be needed for A if database stores inclusive. 
                            // For simplicity assuming backend handled prices correctly or displaying as is.
                            return (
                                <tr key={idx} className="border-b border-black/50">
                                    <td className="p-2 border-r border-black/50">{item.product_id?.toString().slice(-4) || 'ITEM'}</td>
                                    <td className="p-2 border-r border-black/50">{item.name}</td>
                                    <td className="p-2 text-right border-r border-black/50">{item.quantity}</td>
                                    <td className="p-2 text-right border-r border-black/50">{formatMoney(item.price)}</td>
                                    <td className="p-2 text-right border-r border-black/50">0.00</td>
                                    {invoiceLetter === 'A' && <td className="p-2 text-right border-r border-black/50">21%</td>}
                                    <td className="p-2 text-right">{formatMoney(item.price * item.quantity)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* TOTALS & FOOTER */}
            <div className="mt-auto">
                {/* TOTALS */}
                <div className="flex justify-end mb-6">
                    <div className="w-1/2 border border-black p-2 text-xs">
                        {invoiceLetter === 'A' && (
                            <>
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold">Neto Gravado:</span>
                                    <span>{formatMoney(sale.total / 1.21)}</span>
                                </div>
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold">IVA 21%:</span>
                                    <span>{formatMoney(sale.total - (sale.total / 1.21))}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between text-lg mt-2 pt-2 border-t border-black">
                            <span className="font-bold">TOTAL:</span>
                            <span className="font-bold">{formatMoney(sale.total)}</span>
                        </div>
                    </div>
                </div>

                {/* CAE FOOTER */}
                <div className="border border-black p-4 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-4">
                        {sale.afip_data?.cae ? (
                            <div className="bg-white p-1 border border-gray-200">
                                <QRCodeSVG value={qrUrl} size={100} />
                            </div>
                        ) : (
                            <div className="w-24 h-24 bg-gray-200 flex items-center justify-center text-[10px] text-center p-2 text-gray-500">
                                SIN CAE
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {/* AFIP Logo Placeholder */}
                                <h3 className="font-black text-xl italic text-gray-400">ARCA</h3>
                                <span className="text-[10px] font-bold text-gray-500">Administración Federal de Ingresos Públicos</span>
                            </div>
                            <div className="text-xs">
                                <p><span className="font-bold">CAE:</span> {sale.afip_data?.cae || '-'}</p>
                                <p><span className="font-bold">Vto. CAE:</span> {formatDate(sale.afip_data?.cae_expiration)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right text-[10px] text-gray-500 uppercase">
                        Comprobante Autorizado
                    </div>
                </div>
            </div>
        </div>
    );
};

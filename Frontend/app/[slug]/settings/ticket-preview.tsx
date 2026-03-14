import { generateTicketHtml } from '@/utils/printTicket'
import { Receipt } from 'lucide-react'

interface TicketPreviewProps {
    settings: {
        business_name?: string
        address?: string
        tax_id?: string
        header_text?: string
        footer_text?: string
        printer_width?: '80mm' | '58mm'
    }
}

export function TicketPreview({ settings }: TicketPreviewProps) {
    const mockData = {
        organization: {
            name: settings.business_name || 'Mi Negocio',
            address: settings.address || 'Calle Falsa 123',
            taxId: settings.tax_id || '20-12345678-9',
            logoUrl: undefined, // Add logo preview support later if needed
            vatCondition: 'Resp. Inscripto',
            iibb: '901-123456-1',
            startDate: '01/01/2024'
        },
        sale: {
            id: 'REF-0001',
            date: new Date().toISOString(),
            items: [
                { name: 'Café Americano', quantity: 1, price: 2500 },
                { name: 'Medialuna', quantity: 2, price: 900 }
            ],
            total: 4300,
            paymentMethod: 'Efectivo',
            invoiceLetter: 'B',
            invoiceNumber: '00001-00000042',
            ticketNumber: 'T-0042',
            customer: {
                name: 'Consumidor Final',
                id: '---',
                address: '---'
            }
        },
        settings: {
            headerText: settings.header_text,
            footerText: settings.footer_text,
            width: settings.printer_width || '80mm'
        }
    };

    const htmlContent = generateTicketHtml(mockData);

    return (
        <div className="flex flex-col items-center">
            <h3 className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                <Receipt size={16} /> Vista Previa en Vivo (WYSIWYG)
            </h3>

            <div className="bg-white border shadow-lg overflow-hidden rounded-lg">
                <iframe
                    title="Ticket Preview"
                    srcDoc={htmlContent}
                    className="w-full h-[600px] border-none bg-white"
                    style={{ width: settings.printer_width === '58mm' ? '240px' : '320px' }} // Approx screen width for 58mm/80mm
                />
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-2 max-w-[300px]">
                Esta vista previa utiliza el mismo motor de impresión que el ticket real.
            </p>
        </div>
    )
}

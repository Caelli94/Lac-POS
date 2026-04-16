'use server'


import { revalidatePath } from 'next/cache'

import { cookies } from 'next/headers'
import { API_URL } from '@/lib/api-config';

interface CartItem {
    id: string
    name: string
    price: number
    quantity: number
    [key: string]: any; // Allow for extra metadata
}

import { productService } from '@/services/productService';

export async function searchProductsAction(orgId: string, search: string, branchId?: string | null) {
    try {
        const result = await productService.getAll(orgId, { search, limit: 50 });
        const rawProducts = Array.isArray(result) ? result : (result.data || []);

        // Calculate Stock based on Branch (Same logic as page.tsx)
        const products = rawProducts.map((p: any) => {
            let totalStock = 0;
            const hasVariants = p.variants && p.variants.length > 0;

            if (branchId) {
                // Stock específico de la sucursal
                if (hasVariants) {
                    totalStock = p.variants.reduce((sum: number, v: any) => {
                        const vStocks = v.branch_stocks || {};
                        const vStock = vStocks[branchId] || 0;
                        return sum + vStock;
                    }, 0);
                } else {
                    const pStocks = p.branch_stocks || {};
                    totalStock = pStocks[branchId] || 0;
                }
            } else {
                // Stock Global
                if (hasVariants) {
                    totalStock = p.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
                } else {
                    totalStock = p.stock || 0;
                }
            }

            return {
                ...p,
                current_stock: totalStock
            };
        });

        return { success: true, products };
    } catch (error) {
        console.error("Error searching products:", error);
        return { success: false, products: [] };
    }
}

// const API_URL = ... (Removed)

export async function processSaleAction(
    orgId: string,
    slug: string,
    totalAmount: number,
    cart: CartItem[],
    customerId: string | null,
    paymentMethodRaw: string,
    sessionId: string,
    documentType: string = 'ticket',
    payments: any[] = [],
    discountGeneral: any = null,
    roundingDifference: number = 0,
    invoiceLetter: string | null = null,
    fiscalData: any = null,
    surchargeGeneral: any = null,
    manualTaxAdded: boolean = false
) {
    try {
        const cookieStore = await cookies();
        const headers = {
            'Content-Type': 'application/json',
            'Cookie': cookieStore.toString()
        };

        const response = await fetch(`${API_URL}/sales`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                orgId,
                slug,
                totalAmount,
                cart,
                customerId,
                paymentMethod: paymentMethodRaw,
                payments,
                sessionId,
                document_type: documentType,
                discount_general: discountGeneral,
                surcharge_general: surchargeGeneral,
                rounding_difference: roundingDifference,
                invoice_letter: invoiceLetter,
                fiscal_data: fiscalData,
                manual_tax_added: manualTaxAdded
            }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al procesar la venta');
        }

        const data = await response.json();

        revalidatePath(`/${slug}/pos`)
        revalidatePath(`/${slug}/cash`)
        revalidatePath(`/${slug}/sales`)

        return { success: true, sale: { ...data.sale, items: cart } }

    } catch (error: any) {
        console.error("Error procesando venta:", error)
        return { error: error.message || 'Error al registrar la venta.' }
    }
}
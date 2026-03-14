'use server'

import { revalidatePath } from 'next/cache'
import { productService } from '@/services/productService'
import { categoryService } from '@/services/categoryService'
import { settingsService } from '@/services/settingsService'

/**
 * createProductAction:
 * Crea o actualiza un producto.
 */
export async function createProductAction(orgId: string, slug: string, formData: FormData) {
    try {
        const id = formData.get('id') as string;

        // Parse pricing: Ensure it's an array for the backend
        const pricingRaw = formData.get('pricing') as string;
        let pricingArray: any[] = [];
        try {
            const pricingObj = JSON.parse(pricingRaw || '{}');
            pricingArray = Object.keys(pricingObj).map(listId => ({
                list_id: listId,
                name: pricingObj[listId].name,
                price: parseFloat(pricingObj[listId].finalPrice || pricingObj[listId].price || 0),
                cost: parseFloat(pricingObj[listId].cost || 0),
                utilityValue: parseFloat(pricingObj[listId].utilityValue || 0),
                utilityType: pricingObj[listId].utilityType || 'percentage'
            }));
        } catch (e) {
            console.error("[Action] Error parsing pricing:", e);
        }

        const principalPrice = pricingArray.find(p => p.name === 'PRINCIPAL') || pricingArray[0];
        const priceValue = principalPrice ? principalPrice.price : 0;

        // Sanitize lots_data: Must be object or null, NOT string "null"
        const lotsRaw = formData.get('lots_data') as string;
        let lotsData = null;
        if (lotsRaw && lotsRaw !== 'null') {
            try {
                lotsData = JSON.parse(lotsRaw);
            } catch (e) {
                console.error("[Action] Error parsing lots_data:", e);
            }
        }

        // Helper to safely parse JSON strings or return default
        const safeParse = (value: any, defaultValue: any) => {
            if (!value || value === 'null' || value === 'undefined') return defaultValue;
            if (typeof value === 'object') return value; // Already parsed or object
            try {
                return JSON.parse(value);
            } catch (e) {
                console.error(`[Action] JSON Parse Error:`, e, "Value:", value);
                return defaultValue;
            }
        };

        const data: any = {
            organization_id: orgId,
            name: (formData.get('name') as string || '').toUpperCase(),
            sku: (formData.get('sku') as string || '').toUpperCase(),
            barcode: (formData.get('barcode') as string || null),
            price: priceValue,
            image_url: formData.get('image_url') as string || null,
            is_visible: formData.get('is_visible') === 'true',
            manages_lots: formData.get('manages_lots') === 'true',
            category_ids: safeParse(formData.get('category_ids'), []),
            description: formData.get('description') as string || '',
            supplier_id: formData.get('supplier_id') || null,
            variants: safeParse(formData.get('variants'), []),
            pricing: pricingArray,
            custom_attributes: safeParse(formData.get('custom_attributes'), {}),
            cost: parseFloat(formData.get('cost') as string || '0') || 0,
            supplier_product_code: formData.get('supplier_product_code') as string || '',
            update_timestamp: formData.get('update_timestamp') === 'true',
            lots_data: lotsData,
            stock: parseFloat(formData.get('stock') as string || '0') || 0,
            branch_stocks: safeParse(formData.get('branch_stocks'), {})
        }

        let result;
        if (id && id !== 'undefined' && id !== 'null') {
            data.id = id;
            result = await productService.update(data);
        } else {
            result = await productService.create(data);
        }

        revalidatePath(`/${slug}/inventory`)
        return { success: true, data: result }
    } catch (err: any) {
        console.error('[Action] Error in createProductAction:', err);
        return { error: err.message || 'Error al guardar el producto' }
    }
}

/**
 * getBranchesAction:
 * Obtiene la lista de sucursales activas de la organización.
 */
export async function getBranchesAction(orgId: string) {
    try {
        const data = await settingsService.getBranches(orgId);
        return { success: true, data: data || [] }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Las acciones de PriceList se movieron a app/[slug]/settings/actions.ts
// para centralizar la gestión de configuraciones.

// Importamos acciones de PriceList desde settings para compatibilidad
import {
    getPriceListsAction as getPriceLists,
    upsertPriceListAction as upsertPriceList,
    togglePriceListStatusAction as togglePriceListStatus,
    deletePriceListAction as deletePriceList
} from '../../settings/actions';

export async function getPriceListsAction(orgId: string) {
    return getPriceLists(orgId);
}

export async function upsertPriceListAction(orgId: string, name: string, id?: string) {
    return upsertPriceList(orgId, name, id);
}

export async function togglePriceListStatusAction(orgId: string, listId: string, newState: boolean) {
    return togglePriceListStatus(orgId, listId, newState);
}

export async function deletePriceListAction(orgId: string, listId: string) {
    return deletePriceList(orgId, listId);
}

/**
 * upsertCategoryAction:
 * Gestiona la creación y actualización de los rubros (categorías).
 */
export async function upsertCategoryAction(orgId: string, slug: string, categoryData: { id?: string, name: string }) {
    try {
        let result;
        if (categoryData.id) {
            result = await categoryService.update({ id: categoryData.id, name: categoryData.name, organization_id: orgId });
        } else {
            result = await categoryService.create({ name: categoryData.name, organization_id: orgId });
        }

        revalidatePath(`/${slug}/inventory`)
        return { success: true, data: result }
    } catch (err: any) {
        if (err.message === 'DUPLICADO') return { error: "DUPLICADO" };
        return { error: "Error inesperado" };
    }
}

/**
 * updateProductVisibilityAction:
 * Modifica únicamente el estado de visibilidad del producto en la web.
 */
export async function updateProductVisibilityAction(orgId: string, slug: string, productId: string, isVisible: boolean) {
    try {
        await productService.update({ id: productId, is_visible: isVisible, update_timestamp: false });
        revalidatePath(`/${slug}/inventory`)
        return { success: true }
    } catch (err: any) { return { error: "Error al actualizar" } }
}

/**
 * deleteProductsAction:
 * Permite eliminar varios productos seleccionados simultáneamente.
 */
export async function deleteProductsAction(orgId: string, slug: string, productIds: string[]) {
    try {
        await Promise.all(productIds.map(id => productService.delete(id)));

        revalidatePath(`/${slug}/inventory`)
        return { success: true }
    } catch (err: any) { return { error: "Error al eliminar" } }
}

/**
 * deleteProductAction:
 * Elimina un solo producto por su ID.
 */
export async function deleteProductAction(orgId: string, slug: string, productId: string) {
    try {
        await productService.delete(productId);
        revalidatePath(`/${slug}/inventory`)
        return { success: true }
    } catch (err: any) { return { error: "Error al eliminar" } }
}

/**
 * deleteCategoryAction:
 * Elimina un rubro de la organización.
 */
export async function deleteCategoryAction(orgId: string, slug: string, categoryId: string) {
    try {
        await categoryService.delete(categoryId);
        revalidatePath(`/${slug}/inventory`)
        return { success: true }
    } catch (err: any) { return { error: "Error al eliminar" } }
}

export async function checkSkuAction(orgId: string, sku: string) {
    return await productService.checkSku(orgId, sku);
}

/**
 * updateProductBarcodeAction:
 * Actualiza solo el código de barras de un producto.
 */
export async function updateProductBarcodeAction(orgId: string, slug: string, productId: string, barcode: string, variantId?: string) {
    try {
        if (variantId) {
            // Fetch product first to get variants array, then update
            const product = await productService.getById(productId);
            if (!product) throw new Error("Producto no encontrado");

            const updatedVariants = product.variants.map((v: any) =>
                (v._id?.toString() || v.id || v.tempId) === variantId
                    ? { ...v, barcode }
                    : v
            );

            await productService.update({ id: productId, variants: updatedVariants });
        } else {
            await productService.update({ id: productId, barcode });
        }

        revalidatePath(`/${slug}/inventory`);
        revalidatePath(`/${slug}/inventory/labels`);
        return { success: true };
    } catch (err: any) {
        console.error("[Action] Error updating barcode:", err);
        return { error: "Error al actualizar código de barras" };
    }
}
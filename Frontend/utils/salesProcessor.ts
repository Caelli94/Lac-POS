// src/utils/salesProcessor.ts
import { cashService } from '@/services/cashService';

interface SaleData {
    total: number;
    items: any[];
    clientId: string;
    paymentMethod: 'cash' | 'debit' | 'credit' | 'checking_account'; // Cta Cte
    organizationId: string;
    cashRegisterId: string; // ID de la caja de ESTA sucursal/computadora
    userId: string;
}

export async function processSale(saleData: SaleData) {
    console.log("Iniciando procesamiento de venta...");

    try {
        // 1. SIEMPRE: Guardar la venta en la base de datos (Historial de ventas)
        // const saleRecord = await salesService.create(saleData); 
        // Simulamos que obtenemos el ID de la venta creada:
        const saleId = "venta_123_generada_en_bd";

        // 2. LÓGICA INTELIGENTE: ¿A dónde va el dinero?

        if (saleData.paymentMethod === 'checking_account') {
            // CASO A: Cuenta Corriente
            console.log(">> Registrando deuda en Cuenta Corriente...");

            // Aquí llamas a tu servicio de Cuentas Corrientes (el endpoint que hicimos antes)
            // await accountService.addMovement({
            //    clientId: saleData.clientId,
            //    type: 'DEBT', // Debe
            //    amount: saleData.total,
            //    referenceId: saleId
            // });

            // IMPORTANTE: No tocamos la caja. El saldo de efectivo se mantiene igual.

        } else {
            // CASO B: Dinero Real (Efectivo, Tarjeta, etc)
            console.log(">> Ingresando dinero a la Caja...");

            await cashService.registerMovement({
                organizationId: saleData.organizationId,
                cashRegisterId: saleData.cashRegisterId,
                amount: saleData.total, // Positivo porque entra plata
                type: 'SALE',
                description: `Venta #${saleId} - ${saleData.paymentMethod}`,
                userId: saleData.userId,
                paymentMethod: saleData.paymentMethod,
                referenceId: saleId
            });
        }

        return { success: true, saleId };

    } catch (error) {
        console.error("Error procesando la venta:", error);
        throw error;
    }
}
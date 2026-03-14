
import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Supplier } from '../models/Supplier';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Sale, SaleItem } from '../models/Sale';

dotenv.config();

const SUPABASE_URL = process.env.MIGRATION_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.MIGRATION_SUPABASE_KEY || '';
const MONGO_URI = process.env.MONGO_URI || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Falta configuración de Supabase (MIGRATION_SUPABASE_URL, MIGRATION_SUPABASE_KEY)');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const migrate = async () => {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Conectado.');

        console.log('📡 Obteniendo datos de Supabase...');

        // 1. MIGRAR ORGANIZACIONES
        console.log('--- Migrando Organizaciones ---');
        const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*');
        if (orgsError) throw orgsError;

        const orgMap = new Map<string, any>(); // Map SupabaseUUID -> MongoDoc

        for (const org of orgs || []) {
            let mongoOrg = await Organization.findOne({ slug: org.slug });
            if (!mongoOrg) {
                mongoOrg = await Organization.create({
                    name: org.name,
                    slug: org.slug,
                    // Map other fields...
                });
                console.log(`   ✅ Creada ORG: ${org.name}`);
            } else {
                console.log(`   mb Ya existe ORG: ${org.name}`);
            }
            orgMap.set(org.id, mongoOrg);
        }

        // Helper para resolver OrgId
        const resolveOrgId = (supabaseOrgId: string) => {
            const org = orgMap.get(supabaseOrgId);
            return org ? org._id : null;
        }

        // 2. MIGRAR CATEGORIAS
        console.log('--- Migrando Categorías ---');
        const { data: categories } = await supabase.from('categories').select('*');
        const catMap = new Map<string, any>();

        for (const cat of categories || []) {
            const orgId = resolveOrgId(cat.organization_id);
            if (!orgId) continue;

            const exists = await Category.findOne({ supabase_id: cat.id });
            if (!exists) {
                const newCat = await Category.create({
                    name: cat.name,
                    organization_id: orgId,
                    supabase_id: cat.id
                });
                catMap.set(cat.id, newCat._id);
                process.stdout.write('.');
            } else {
                catMap.set(cat.id, exists._id);
            }
        }
        console.log('\n✅ Categorías migradas.');

        // 3. MIGRAR PROVEEDORES
        console.log('--- Migrando Proveedores ---');
        const { data: suppliers } = await supabase.from('suppliers').select('*');
        const suppMap = new Map<string, any>();

        for (const sup of suppliers || []) {
            const orgId = resolveOrgId(sup.organization_id);
            if (!orgId) continue;

            const exists = await Supplier.findOne({ supabase_id: sup.id });
            if (!exists) {
                const newSup = await Supplier.create({
                    name: sup.name,
                    email: sup.email,
                    phone: sup.phone,
                    organization_id: orgId,
                    supabase_id: sup.id
                });
                suppMap.set(sup.id, newSup._id);
                process.stdout.write('.');
            } else {
                suppMap.set(sup.id, exists._id);
            }
        }
        console.log('\n✅ Proveedores migrados.');

        // 4. MIGRAR CLIENTES
        console.log('--- Migrando Clientes ---');
        const { data: customers } = await supabase.from('customers').select('*');
        const custMap = new Map<string, any>();

        for (const cust of customers || []) {
            const orgId = resolveOrgId(cust.organization_id);
            if (!orgId) continue;

            const exists = await Customer.findOne({ supabase_id: cust.id });
            if (!exists) {
                const newCust = await Customer.create({
                    name: cust.name,
                    doc_number: cust.doc_number,
                    email: cust.email,
                    organization_id: orgId,
                    supabase_id: cust.id
                });
                custMap.set(cust.id, newCust._id);
                process.stdout.write('.');
            } else {
                custMap.set(cust.id, exists._id);
            }
        }
        console.log('\n✅ Clientes migrados.');

        // 5. MIGRAR PRODUCTOS
        console.log('--- Migrando Productos ---');
        const { data: products } = await supabase.from('products').select('*');
        const prodMap = new Map<string, any>();

        for (const prod of products || []) {
            const orgId = resolveOrgId(prod.organization_id);
            if (!orgId) continue;

            const exists = await Product.findOne({ supabase_id: prod.id });
            if (!exists) {
                const newProd = await Product.create({
                    name: prod.name,
                    price: prod.price,
                    stock: prod.stock,
                    cost: prod.cost,
                    category_id: catMap.get(prod.category_id), // Resolve MongoID for Category
                    supplier_id: suppMap.get(prod.supplier_id), // Resolve MongoID for Supplier
                    organization_id: orgId,
                    supabase_id: prod.id
                });
                prodMap.set(prod.id, newProd._id);
                process.stdout.write('.');
            } else {
                prodMap.set(prod.id, exists._id);
            }
        }
        console.log('\n✅ Productos migrados.');

        // 6. MIGRAR VENTAS E ITEMS (Simplified)
        console.log('--- Migrando Ventas ---');
        const { data: sales } = await supabase.from('sales').select('*');

        for (const sale of sales || []) {
            const orgId = resolveOrgId(sale.organization_id);
            if (!orgId) continue;

            let saleDoc = await Sale.findOne({ supabase_id: sale.id });
            if (!saleDoc) {
                saleDoc = await Sale.create({
                    total_amount: sale.total_amount,
                    payment_method: sale.payment_method || 'cash',
                    status: 'completed',
                    date: sale.created_at,
                    customer_id: custMap.get(sale.customer_id),
                    organization_id: orgId,
                    supabase_id: sale.id
                });

                // Migrar Items de esta venta
                const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
                if (items) {
                    for (const item of items) {
                        // Buscar ID del producto en Mongo
                        // Nota: Podría fallar si borraste productos en Supabase, así que cuidado.
                        // Usamos el prodMap o buscamos en DB por supabase_id
                        let prodId = prodMap.get(item.product_id);
                        if (!prodId) {
                            const p = await Product.findOne({ supabase_id: item.product_id });
                            if (p) prodId = p._id;
                        }

                        if (prodId) {
                            await SaleItem.create({
                                sale_id: saleDoc._id,
                                product_id: prodId,
                                product_name: item.product_name || 'Item Legacy',
                                quantity: item.quantity,
                                unit_price: item.unit_price,
                                total_price: item.total_price,
                                supabase_id: item.id
                            });
                        }
                    }
                }
                process.stdout.write('.');
            }
        }
        console.log('\n✅ Ventas migradas.');


        console.log('🎉 Migración Finalizada con Éxito');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error en migración:', error);
        process.exit(1);
    }
};

migrate();

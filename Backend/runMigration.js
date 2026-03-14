
const { createClient } = require('@supabase/supabase-js');
const mongoose = require('mongoose');
const path = require('path');

// Intentamos cargar las variables de entorno si existen, aunque las pasaremos por CLI
require('dotenv').config();

// Módulos compilados (ajusta la ruta si es necesario)
const Organization = require('./dist/models/Organization').Organization;
const Category = require('./dist/models/Category').Category;
const Supplier = require('./dist/models/Supplier').Supplier;
const Customer = require('./dist/models/Customer').Customer;
const Product = require('./dist/models/Product').Product;
// Nota: Sale exporta Sale y SaleItem
const SaleModels = require('./dist/models/Sale');
const Sale = SaleModels.Sale;
const SaleItem = SaleModels.SaleItem;

const SUPABASE_URL = process.env.MIGRATION_SUPABASE_URL || 'https://hktxfhbeiyrddxpmipir.supabase.co';
const SUPABASE_KEY = process.env.MIGRATION_SUPABASE_KEY;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://LuchinCaelli:4631911-Lac3762@cluster0.yyzeliw.mongodb.net/mi_sistema_saas?appName=Cluster0";

if (!SUPABASE_KEY) {
    console.error('❌ Falta MIGRATION_SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const migrate = async () => {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ MongoDB Conectado.');

        console.log('📡 Obteniendo datos de Supabase...');

        // 1. MIGRAR ORGANIZACIONES
        console.log('--- Migrando Organizaciones ---');
        const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*');
        if (orgsError) throw orgsError;

        const orgMap = new Map(); // SupabaseUUID -> MongoDoc

        for (const org of orgs || []) {
            let mongoOrg = await Organization.findOne({ slug: org.slug });
            if (!mongoOrg) {
                mongoOrg = await Organization.create({
                    name: org.name,
                    slug: org.slug,
                });
                console.log(`   ✅ Creada ORG: ${org.name}`);
            } else {
                console.log(`   mb Ya existe ORG: ${org.name}`);
            }
            orgMap.set(org.id, mongoOrg);
        }

        const resolveOrgId = (supabaseOrgId) => {
            const org = orgMap.get(supabaseOrgId);
            return org ? org._id : null;
        }

        // 2. MIGRAR CATEGORIAS
        console.log('--- Migrando Categorías ---');
        const { data: categories } = await supabase.from('categories').select('*');
        const catMap = new Map();

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
            } else {
                catMap.set(cat.id, exists._id);
            }
        }
        console.log(`✅ ${catMap.size} Categorías migradas.`);

        // 3. MIGRAR PROVEEDORES
        console.log('--- Migrando Proveedores ---');
        const { data: suppliers } = await supabase.from('suppliers').select('*');
        const suppMap = new Map();

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
            } else {
                suppMap.set(sup.id, exists._id);
            }
        }
        console.log(`✅ ${suppMap.size} Proveedores migrados.`);

        // 4. MIGRAR CLIENTES
        console.log('--- Migrando Clientes ---');
        const { data: customers } = await supabase.from('customers').select('*');
        const custMap = new Map();

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
            } else {
                custMap.set(cust.id, exists._id);
            }
        }
        console.log(`✅ ${custMap.size} Clientes migrados.`);

        // 5. MIGRAR PRODUCTOS
        console.log('--- Migrando Productos ---');
        const { data: products } = await supabase.from('products').select('*');
        const prodMap = new Map();

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
                    category_id: catMap.get(prod.category_id),
                    supplier_id: suppMap.get(prod.supplier_id),
                    organization_id: orgId,
                    supabase_id: prod.id
                });
                prodMap.set(prod.id, newProd._id);
            } else {
                prodMap.set(prod.id, exists._id);
            }
        }
        console.log(`✅ ${prodMap.size} Productos migrados.`);

        // 6. MIGRAR VENTAS E ITEMS
        console.log('--- Migrando Ventas ---');
        const { data: sales } = await supabase.from('sales').select('*');
        let salesCount = 0;

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

                const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
                if (items) {
                    for (const item of items) {
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
                salesCount++;
            }
        }
        console.log(`✅ ${salesCount} Ventas migradas.`);


        console.log('🎉 Migración Finalizada con Éxito');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error en migración:', error);
        process.exit(1);
    }
};

migrate();

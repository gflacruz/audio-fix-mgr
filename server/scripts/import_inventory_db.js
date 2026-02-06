const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const xlsx = require('xlsx');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const EXCEL_FILE = path.join(__dirname, '../inventory_export.xlsx');

async function importInventory() {
    const client = await pool.connect();
    
    try {
        console.log('Reading Excel file...');
        const workbook = xlsx.readFile(EXCEL_FILE);
        
        const partsSheet = workbook.Sheets['Parts'];
        const aliasesSheet = workbook.Sheets['Aliases'];
        
        const partsData = xlsx.utils.sheet_to_json(partsSheet);
        const aliasesData = xlsx.utils.sheet_to_json(aliasesSheet);
        
        console.log(`Found ${partsData.length} parts to import.`);
        console.log(`Found ${aliasesData.length} aliases to import.`);

        await client.query('BEGIN');

        // 1. Insert Parts and build map of PartName -> ID
        console.log('Importing parts...');
        const partNameToId = new Map();

        // Prepare statement for parts
        // User Request: Map Excel 'description' to DB 'nomenclature'
        const insertPartQuery = `
            INSERT INTO parts (
                name, 
                nomenclature, 
                retail_price, 
                wholesale_price, 
                quantity_in_stock, 
                low_limit, 
                on_order, 
                best_price_quality, 
                unit_of_issue, 
                last_supplier, 
                supply_source, 
                remarks,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            RETURNING id, name;
        `;

        for (const part of partsData) {
            // Data cleaning / defaults
            const name = part.name ? String(part.name).trim() : null;
            if (!name) continue; // Skip if no name

            // Excel 'description' goes to DB 'nomenclature' per user request
            const nomenclature = part.description ? String(part.description).trim() : null;
            
            const retail_price = parseFloat(part.retail_price) || 0;
            const wholesale_price = parseFloat(part.wholesale_price) || 0;
            const quantity_in_stock = parseInt(part.quantity_in_stock) || 0;
            const low_limit = parseInt(part.low_limit) || 0;
            const on_order = parseInt(part.on_order) || 0;
            const best_price_quality = part.best_price_quality ? String(part.best_price_quality) : null;
            const unit_of_issue = part.unit_of_issue ? String(part.unit_of_issue) : null;
            const last_supplier = part.last_supplier ? String(part.last_supplier) : null;
            const supply_source = part.supply_source ? String(part.supply_source) : null;
            const remarks = part.remarks ? String(part.remarks) : null;

            const res = await client.query(insertPartQuery, [
                name,
                nomenclature,
                retail_price,
                wholesale_price,
                quantity_in_stock,
                low_limit,
                on_order,
                best_price_quality,
                unit_of_issue,
                last_supplier,
                supply_source,
                remarks
            ]);
            
            // Map the name to the new DB ID
            partNameToId.set(name, res.rows[0].id);
        }
        
        console.log('Parts imported successfully.');

        // 2. Insert Aliases
        console.log('Importing aliases...');
        const insertAliasQuery = `
            INSERT INTO part_aliases (part_id, alias) VALUES ($1, $2)
        `;

        let aliasCount = 0;
        let missingParentCount = 0;

        for (const aliasRow of aliasesData) {
            const partName = aliasRow.part_name ? String(aliasRow.part_name).trim() : null;
            const alias = aliasRow.alias ? String(aliasRow.alias).trim() : null;

            if (!partName || !alias) continue;

            const partId = partNameToId.get(partName);

            if (partId) {
                await client.query(insertAliasQuery, [partId, alias]);
                aliasCount++;
            } else {
                missingParentCount++;
            }
        }

        console.log(`Aliases imported: ${aliasCount}`);
        if (missingParentCount > 0) {
            console.log(`Warning: ${missingParentCount} aliases skipped because parent part was not found.`);
        }

        await client.query('COMMIT');
        console.log('Import transaction committed.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error importing data:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

importInventory();

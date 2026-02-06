const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Paths
const DATA_DIR = path.join(__dirname, '../data/TechServ - Parts');
const OUT_FILE = path.join(__dirname, '../inventory_export.xlsx');

/**
 * simple dBase III DBF Parser
 */
function parseDBF(buffer) {
    const header = {
        version: buffer.readUInt8(0),
        lastUpdate: {
            year: buffer.readUInt8(1) + 1900,
            month: buffer.readUInt8(2),
            day: buffer.readUInt8(3)
        },
        numberOfRecords: buffer.readUInt32LE(4),
        headerLength: buffer.readUInt16LE(8),
        recordLength: buffer.readUInt16LE(10)
    };

    // Parse Fields
    const fields = [];
    let offset = 32;
    while (offset < header.headerLength) {
        if (buffer.readUInt8(offset) === 0x0D) break; // Header terminator

        const name = buffer.toString('ascii', offset, offset + 11).replace(/\u0000/g, '').trim();
        const type = String.fromCharCode(buffer.readUInt8(offset + 11));
        const length = buffer.readUInt8(offset + 16);
        const decimalCount = buffer.readUInt8(offset + 17);

        fields.push({ name, type, length, decimalCount });
        offset += 32;
    }

    // Parse Records
    const records = [];
    let recordOffset = header.headerLength;

    for (let i = 0; i < header.numberOfRecords; i++) {
        // Check for EOF or invalid offset
        if (recordOffset >= buffer.length) break;

        const deletionFlag = buffer.readUInt8(recordOffset);
        // 0x2A (*) is deleted, 0x20 (space) is valid
        // We will include deleted records but mark them, or just skip. 
        // Let's include valid ones only for now.
        
        if (deletionFlag === 0x20) { 
            const record = {};
            let fieldOffset = 1; // Skip deletion flag

            fields.forEach(field => {
                const raw = buffer.toString('latin1', recordOffset + fieldOffset, recordOffset + fieldOffset + field.length); // Use latin1 to preserve bytes
                let value = raw.trim();

                if (field.type === 'N' || field.type === 'F') {
                    value = value === '' ? null : parseFloat(value);
                } else if (field.type === 'D') {
                    // YYYYMMDD
                    if (value.length === 8) {
                        value = `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}`;
                    } else {
                        value = null;
                    }
                } else if (field.type === 'L') {
                    value = ['Y', 'y', 'T', 't'].includes(value);
                }

                record[field.name] = value;
                fieldOffset += field.length;
            });
            records.push(record);
        }
        
        recordOffset += header.recordLength;
    }

    return { header, fields, records };
}

function convertToSQLFormat(priRecords, secRecords) {
    // Map PART_PRI to 'parts' sheet format
    const partsSheet = priRecords.map(r => {
        return {
            name: r.PRI_PARTNO || r.PRI_PART, // Handle variations if field name differs
            nomenclature: null, // Not directly in DBF, maybe use Description?
            description: r.DESCRIPTN,
            retail_price: r.PRIC_RTAIL,
            wholesale_price: r.COST,
            quantity_in_stock: r.ON_HAND,
            low_limit: r.LOW_LIMIT,
            on_order: r.ON_ORDER,
            location: null, // Not found in PART_PRI
            best_price_quality: r.BEST_QTY,
            unit_of_issue: r.UNIT_ISSUE,
            last_supplier: r.SUPPLIER,
            supply_source: r.SORC_SPLYR,
            remarks: r.REMARKS,
            // Additional stats useful for import but not in SQL core fields
            stats_issue_ytd: r.ISSUE_YTD,
            stats_last_used: r.LAST_USED
        };
    });

    // Map PART_SEC to 'part_aliases' sheet format
    const aliasesSheet = secRecords.map(r => {
        return {
            part_name: r.PRI_PART, // Foreign key reference (by name for now)
            alias: r.SEC_PART,
            manufacturer_code: r.MFG_CODE,
            cost: r.SEC_COST
        };
    });

    return { partsSheet, aliasesSheet };
}

async function main() {
    try {
        console.log('Reading DBF files...');
        
        const priPath = path.join(DATA_DIR, 'PART_PRI.DBF');
        const secPath = path.join(DATA_DIR, 'PART_SEC.DBF');

        if (!fs.existsSync(priPath)) throw new Error(`File not found: ${priPath}`);
        if (!fs.existsSync(secPath)) throw new Error(`File not found: ${secPath}`);

        const priBuf = fs.readFileSync(priPath);
        const secBuf = fs.readFileSync(secPath);

        const priData = parseDBF(priBuf);
        console.log(`Parsed PART_PRI: ${priData.records.length} records.`);

        const secData = parseDBF(secBuf);
        console.log(`Parsed PART_SEC: ${secData.records.length} records.`);

        const { partsSheet, aliasesSheet } = convertToSQLFormat(priData.records, secData.records);

        // Create Workbook
        const wb = xlsx.utils.book_new();
        
        // Add Parts Sheet
        const wsParts = xlsx.utils.json_to_sheet(partsSheet);
        xlsx.utils.book_append_sheet(wb, wsParts, 'Parts');

        // Add Aliases Sheet
        const wsAliases = xlsx.utils.json_to_sheet(aliasesSheet);
        xlsx.utils.book_append_sheet(wb, wsAliases, 'Aliases');

        // Write File
        xlsx.writeFile(wb, OUT_FILE);
        console.log(`Successfully created Excel file at: ${OUT_FILE}`);

    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();

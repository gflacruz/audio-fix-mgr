const db = require('../db');

async function migrate() {
  try {
    console.log('Starting migration: Adding rush_fee and on_site_fee columns...');

    // Add rush_fee column
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'repairs' AND column_name = 'rush_fee') THEN
          ALTER TABLE repairs ADD COLUMN rush_fee DECIMAL(10, 2) DEFAULT 0.00;
          RAISE NOTICE 'Added rush_fee column';
        END IF;
      END
      $$;
    `);

    // Add on_site_fee column
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'repairs' AND column_name = 'on_site_fee') THEN
          ALTER TABLE repairs ADD COLUMN on_site_fee DECIMAL(10, 2) DEFAULT 0.00;
          RAISE NOTICE 'Added on_site_fee column';
        END IF;
      END
      $$;
    `);

    console.log('Columns added/verified. Starting backfill...');

    // Backfill Rush Fee
    const rushResult = await db.query(`
      UPDATE repairs 
      SET rush_fee = 100.00 
      WHERE priority = 'rush' AND (rush_fee IS NULL OR rush_fee = 0)
    `);
    console.log(`Backfilled rush_fee for ${rushResult.rowCount} rows.`);

    // Backfill On-Site Fee
    const onSiteResult = await db.query(`
      UPDATE repairs 
      SET on_site_fee = 125.00 
      WHERE is_on_site = TRUE AND (on_site_fee IS NULL OR on_site_fee = 0)
    `);
    console.log(`Backfilled on_site_fee for ${onSiteResult.rowCount} rows.`);

    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

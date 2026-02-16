const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper to format part object
const formatPart = (row) => ({
  id: row.id,
  name: row.name,
  nomenclature: row.nomenclature,
  retailPrice: parseFloat(row.retail_price),
  wholesalePrice: parseFloat(row.wholesale_price),
  quantityInStock: row.quantity_in_stock,
  lowLimit: row.low_limit,
  onOrder: row.on_order,
  aliases: row.aliases,
  location: row.location,
  description: row.description,
  imageUrl: row.image_url,
  imagePublicId: row.image_public_id,
  bestPriceQuality: row.best_price_quality,
  unitOfIssue: row.unit_of_issue,
  lastSupplier: row.last_supplier,
  supplySource: row.supply_source,
  category: row.category,
  remarks: row.remarks,
  // Calculated fields (might be undefined if not in query)
  issuedYtd: row.issued_ytd ? parseInt(row.issued_ytd) : 0,
  lastUsedDate: row.last_used_date || null
});

// GET /api/parts - List all parts (Searchable & Paginated)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, 
             COALESCE(json_agg(pa.alias) FILTER (WHERE pa.alias IS NOT NULL), '[]') as aliases,
             COUNT(*) OVER() as full_count
      FROM parts p
      LEFT JOIN part_aliases pa ON p.id = pa.part_id
    `;
    
    const params = [];
    
    if (search) {
      query += ` 
        WHERE p.name ILIKE $1 
        OR p.nomenclature ILIKE $1
        OR pa.alias ILIKE $1
      `;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY p.id ORDER BY p.name ASC`;
    
    // Add pagination
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    
    // Format response (camelCase)
    const parts = result.rows.map(row => {
        // Remove full_count from individual part object to keep it clean
        const { full_count, ...partData } = row; 
        return formatPart(partData);
    });

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].full_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
        data: parts,
        pagination: {
            total: totalCount,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages
        }
    });
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/parts/:id - Get single part details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.*, 
             (SELECT COALESCE(json_agg(alias), '[]') FROM part_aliases WHERE part_id = p.id) as aliases,
             (SELECT COALESCE(SUM(quantity), 0) FROM repair_parts WHERE part_id = p.id AND created_at >= date_trunc('year', CURRENT_DATE)) as issued_ytd,
             (SELECT MAX(created_at) FROM repair_parts WHERE part_id = p.id) as last_used_date
      FROM parts p
      WHERE p.id = $1
    `;
    
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }

    const part = formatPart(result.rows[0]);
    res.json(part);
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/parts - Create a new part (Admin only)
router.post('/', verifyToken, verifyAdmin, upload.single('image'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { 
      name, nomenclature, retailPrice, wholesalePrice, quantityInStock, lowLimit, onOrder, 
      aliases, location, description, bestPriceQuality, unitOfIssue, lastSupplier, supplySource, category, remarks
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Part name is required' });
    }

    let imageUrl = null;
    let imagePublicId = null;

    // Handle Image Upload
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'audio_fix_inventory' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          require('stream').Readable.from(req.file.buffer).pipe(uploadStream);
      });
      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
    }

    await client.query('BEGIN');

    // Insert Part
    const partResult = await client.query(
      `INSERT INTO parts (
        name, nomenclature, retail_price, wholesale_price, quantity_in_stock, low_limit, on_order,
        location, description, best_price_quality, unit_of_issue, last_supplier, supply_source, category, remarks,
        image_url, image_public_id
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        name,
        nomenclature || null,
        retailPrice || 0,
        wholesalePrice || 0,
        quantityInStock || 0,
        lowLimit || 0,
        onOrder || 0,
        location || null,
        description || null,
        bestPriceQuality || null,
        unitOfIssue || null,
        lastSupplier || null,
        supplySource || null,
        category || null,
        remarks || null,
        imageUrl,
        imagePublicId
      ]
    );
    const part = partResult.rows[0];

    // Insert Aliases
    let aliasList = aliases;
    if (typeof aliases === 'string') {
        try {
            aliasList = JSON.parse(aliases);
        } catch (e) {
            aliasList = aliases.split(',').map(a => a.trim()).filter(a => a);
        }
    }

    if (aliasList && Array.isArray(aliasList) && aliasList.length > 0) {
      for (const alias of aliasList) {
        await client.query('INSERT INTO part_aliases (part_id, alias) VALUES ($1, $2)', [part.id, alias]);
      }
    }

    await client.query('COMMIT');
    
    // Attach aliases to result for formatting
    part.aliases = aliasList || [];
    
    res.status(201).json(formatPart(part));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating part:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/parts/:id - Update part (Admin only)
router.patch('/:id', verifyToken, verifyAdmin, upload.single('image'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { 
      name, nomenclature, retailPrice, wholesalePrice, quantityInStock, lowLimit, onOrder,
      aliases, location, description, bestPriceQuality, unitOfIssue, lastSupplier, supplySource, category, remarks
    } = req.body;

    // Fetch existing part to check for old image
    const existingRes = await client.query('SELECT image_public_id FROM parts WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
        return res.status(404).json({ error: 'Part not found' });
    }
    const oldPublicId = existingRes.rows[0].image_public_id;

    let imageUrl = null;
    let imagePublicId = null;
    let updateImage = false;

    // Handle Image Upload
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'audio_fix_inventory' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          require('stream').Readable.from(req.file.buffer).pipe(uploadStream);
      });
      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
      updateImage = true;
    }

    await client.query('BEGIN');

    // Build Update Query
    let query = `UPDATE parts SET
      name = $1,
      nomenclature = $2,
      retail_price = $3,
      wholesale_price = $4,
      quantity_in_stock = $5,
      low_limit = $6,
      on_order = $7,
      location = $8,
      description = $9,
      best_price_quality = $10,
      unit_of_issue = $11,
      last_supplier = $12,
      supply_source = $13,
      category = $14,
      remarks = $15
    `;

    const params = [
      name,
      nomenclature || null,
      retailPrice,
      wholesalePrice,
      quantityInStock,
      lowLimit || 0,
      onOrder || 0,
      location || null,
      description || null,
      bestPriceQuality || null,
      unitOfIssue || null,
      lastSupplier || null,
      supplySource || null,
      category || null,
      remarks || null
    ];
    let paramIndex = 16;

    if (updateImage) {
        query += `, image_url = $${paramIndex}, image_public_id = $${paramIndex + 1}`;
        params.push(imageUrl, imagePublicId);
        paramIndex += 2;
    }

    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);

    // Update Part
    const partResult = await client.query(query, params);

    // Update Aliases (Delete all and re-insert)
    await client.query('DELETE FROM part_aliases WHERE part_id = $1', [id]);

    let aliasList = aliases;
    if (typeof aliases === 'string') {
        try {
            aliasList = JSON.parse(aliases);
        } catch (e) {
            aliasList = aliases.split(',').map(a => a.trim()).filter(a => a);
        }
    }

    if (aliasList && Array.isArray(aliasList) && aliasList.length > 0) {
      for (const alias of aliasList) {
        await client.query('INSERT INTO part_aliases (part_id, alias) VALUES ($1, $2)', [id, alias]);
      }
    }

    await client.query('COMMIT');

    // Clean up old image if replaced
    if (updateImage && oldPublicId) {
        try {
            await cloudinary.uploader.destroy(oldPublicId);
        } catch (e) {
            console.error('Failed to delete old image from Cloudinary:', e);
        }
    }

    const part = partResult.rows[0];
    part.aliases = aliasList || [];
    
    res.json(formatPart(part));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating part:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/parts/:id - Delete part (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM parts WHERE id = $1', [id]);
    res.json({ message: 'Part deleted successfully' });
  } catch (error) {
    console.error('Error deleting part:', error);
    if (error.code === '23503') {
       return res.status(400).json({ error: 'Cannot delete part because it is used in repair tickets.' });
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;

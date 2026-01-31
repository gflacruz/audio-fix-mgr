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

// GET /api/parts - List all parts (Searchable)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT p.*, 
             (SELECT COALESCE(json_agg(alias), '[]') FROM part_aliases WHERE part_id = p.id) as aliases
      FROM parts p
    `;
    
    const params = [];
    
    if (search) {
      query += ` 
        WHERE p.name ILIKE $1 
        OR EXISTS (SELECT 1 FROM part_aliases pa WHERE pa.part_id = p.id AND pa.alias ILIKE $1)
      `;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY p.name ASC`;

    const result = await db.query(query, params);
    
    // Format response (camelCase)
    const parts = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      retailPrice: parseFloat(row.retail_price),
      wholesalePrice: parseFloat(row.wholesale_price),
      quantityInStock: row.quantity_in_stock,
      aliases: row.aliases,
      location: row.location,
      description: row.description,
      imageUrl: row.image_url,
      imagePublicId: row.image_public_id
    }));

    res.json(parts);
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/parts/:id - Get single part details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.*, 
             (SELECT COALESCE(json_agg(alias), '[]') FROM part_aliases WHERE part_id = p.id) as aliases
      FROM parts p
      WHERE p.id = $1
    `;
    
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }

    const row = result.rows[0];
    const part = {
      id: row.id,
      name: row.name,
      retailPrice: parseFloat(row.retail_price),
      wholesalePrice: parseFloat(row.wholesale_price),
      quantityInStock: row.quantity_in_stock,
      aliases: row.aliases,
      location: row.location,
      description: row.description,
      imageUrl: row.image_url,
      imagePublicId: row.image_public_id
    };

    res.json(part);
  } catch (error) {
    console.error('Error fetching part details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/parts - Create a new part (Admin only)
router.post('/', verifyToken, verifyAdmin, upload.single('image'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { name, retailPrice, wholesalePrice, quantityInStock, aliases, location, description } = req.body;

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
      `INSERT INTO parts (name, retail_price, wholesale_price, quantity_in_stock, location, description, image_url, image_public_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        name, 
        retailPrice || 0, 
        wholesalePrice || 0, 
        quantityInStock || 0,
        location || null,
        description || null,
        imageUrl,
        imagePublicId
      ]
    );
    const part = partResult.rows[0];

    // Insert Aliases
    // Parse aliases if it comes as a string (FormData limitation for arrays sometimes)
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

    res.status(201).json({
      id: part.id,
      name: part.name,
      retailPrice: parseFloat(part.retail_price),
      wholesalePrice: parseFloat(part.wholesale_price),
      quantityInStock: part.quantity_in_stock,
      aliases: aliasList || [],
      location: part.location,
      description: part.description,
      imageUrl: part.image_url,
      imagePublicId: part.image_public_id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating part:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/parts/:id - Update part (Admin only)
router.patch('/:id', verifyToken, verifyAdmin, upload.single('image'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { name, retailPrice, wholesalePrice, quantityInStock, aliases, location, description } = req.body;

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
    let query = `UPDATE parts SET name = $1, retail_price = $2, wholesale_price = $3, quantity_in_stock = $4, location = $5, description = $6`;
    const params = [name, retailPrice, wholesalePrice, quantityInStock, location || null, description || null];
    let paramIndex = 7;

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
    res.json({
      id: part.id,
      name: part.name,
      retailPrice: parseFloat(part.retail_price),
      wholesalePrice: parseFloat(part.wholesale_price),
      quantityInStock: part.quantity_in_stock,
      aliases: aliasList || [],
      location: part.location,
      description: part.description,
      imageUrl: part.image_url,
      imagePublicId: part.image_public_id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating part:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/parts/:id - Delete part (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Note: ON DELETE CASCADE in schema handles aliases and repair_links automatically?
    // In inventory.sql:
    // part_aliases: ON DELETE CASCADE - Yes
    // repair_parts: part_id REFERENCES parts(id) - No CASCADE specified for part_id deletion?
    // Wait, let me check the schema I wrote.
    
    await db.query('DELETE FROM parts WHERE id = $1', [id]);
    res.json({ message: 'Part deleted successfully' });
  } catch (error) {
    // If foreign key constraint fails (used in repairs), we might want to block deletion or handle it.
    console.error('Error deleting part:', error);
    if (error.code === '23503') {
       return res.status(400).json({ error: 'Cannot delete part because it is used in repair tickets.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

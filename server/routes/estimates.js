const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/estimates/repair/:repairId - Get all estimates for a repair
router.get('/repair/:repairId', async (req, res) => {
  try {
    const { repairId } = req.params;
    const result = await db.query(
      'SELECT * FROM estimates WHERE repair_id = $1 ORDER BY created_at DESC',
      [repairId]
    );
    
    // Map snake_case to camelCase
    const formatted = result.rows.map(row => ({
      id: row.id,
      repairId: row.repair_id,
      diagnosticNotes: row.diagnostic_notes,
      workPerformed: row.work_performed,
      laborCost: parseFloat(row.labor_cost) || 0,
      partsCost: parseFloat(row.parts_cost) || 0,
      totalCost: parseFloat(row.total_cost) || 0,
      status: row.status,
      createdTechnician: row.created_technician,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      notifiedDate: row.notified_date,
      approvedDate: row.approved_date
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching estimates:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/estimates/:id - Get a single estimate
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if id is actually an integer to avoid casting errors if "repair" word is passed mistakenly
    if (isNaN(parseInt(id))) {
       // Fallthrough to next route if not a number (e.g. "repair")
       return req.next();
    }

    const result = await db.query('SELECT * FROM estimates WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const row = result.rows[0];
    const formatted = {
      id: row.id,
      repairId: row.repair_id,
      diagnosticNotes: row.diagnostic_notes,
      workPerformed: row.work_performed,
      laborCost: parseFloat(row.labor_cost) || 0,
      partsCost: parseFloat(row.parts_cost) || 0,
      totalCost: parseFloat(row.total_cost) || 0,
      status: row.status,
      createdTechnician: row.created_technician,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      notifiedDate: row.notified_date,
      approvedDate: row.approved_date
    };

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching estimate:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/estimates - Create a new estimate
router.post('/', verifyToken, async (req, res) => {
  try {
    const { 
      repairId, 
      diagnosticNotes, 
      workPerformed, 
      laborCost, 
      partsCost, 
      createdTechnician 
    } = req.body;

    if (!repairId) {
      return res.status(400).json({ error: 'Repair ID is required' });
    }

    const labor = parseFloat(laborCost) || 0;
    const parts = parseFloat(partsCost) || 0;
    const total = labor + parts;

    const result = await db.query(
      `INSERT INTO estimates 
       (repair_id, diagnostic_notes, work_performed, labor_cost, parts_cost, total_cost, status, created_technician)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
       RETURNING *`,
      [repairId, diagnosticNotes, workPerformed, labor, parts, total, createdTechnician]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      repairId: row.repair_id,
      diagnosticNotes: row.diagnostic_notes,
      workPerformed: row.work_performed,
      laborCost: parseFloat(row.labor_cost),
      partsCost: parseFloat(row.parts_cost),
      totalCost: parseFloat(row.total_cost),
      status: row.status,
      createdTechnician: row.created_technician,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('Error creating estimate:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PATCH /api/estimates/:id - Update an estimate
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Whitelist allowed fields
    const allowedFields = [
      'diagnosticNotes',
      'workPerformed',
      'laborCost',
      'partsCost',
      'status',
      'notifiedDate',
      'approvedDate'
    ];

    const fieldsToUpdate = [];
    const values = [];
    let paramIndex = 1;

    // Handle cost calculations if either cost updates
    let labor = undefined;
    let parts = undefined;
    
    // Helper to map and push
    const addField = (colName, val) => {
      fieldsToUpdate.push(`${colName} = $${paramIndex}`);
      values.push(val);
      paramIndex++;
    };

    if (updates.laborCost !== undefined) labor = parseFloat(updates.laborCost);
    if (updates.partsCost !== undefined) parts = parseFloat(updates.partsCost);

    // If costs are changing, we need to update total_cost too
    if (labor !== undefined || parts !== undefined) {
      // We need to fetch current values if one is missing to calculate total
      // Or we can just trust the client to send both? 
      // Safer: Just update what is sent, and use a SQL expression or fetch-first.
      // Let's simpler: If client updates costs, they should ideally send both or we calculate.
      // Actually, standard practice: Let's fetch the current estimate first.
      
      const currentRes = await db.query('SELECT labor_cost, parts_cost FROM estimates WHERE id = $1', [id]);
      if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Estimate not found' });
      
      const current = currentRes.rows[0];
      const finalLabor = labor !== undefined ? labor : parseFloat(current.labor_cost);
      const finalParts = parts !== undefined ? parts : parseFloat(current.parts_cost);
      
      addField('labor_cost', finalLabor);
      addField('parts_cost', finalParts);
      addField('total_cost', finalLabor + finalParts);
    }

    if (updates.diagnosticNotes !== undefined) addField('diagnostic_notes', updates.diagnosticNotes);
    if (updates.workPerformed !== undefined) addField('work_performed', updates.workPerformed);
    if (updates.status !== undefined) addField('status', updates.status);
    if (updates.notifiedDate !== undefined) addField('notified_date', updates.notifiedDate);
    if (updates.approvedDate !== undefined) addField('approved_date', updates.approvedDate);

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE estimates SET ${fieldsToUpdate.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      repairId: row.repair_id,
      diagnosticNotes: row.diagnostic_notes,
      workPerformed: row.work_performed,
      laborCost: parseFloat(row.labor_cost),
      partsCost: parseFloat(row.parts_cost),
      totalCost: parseFloat(row.total_cost),
      status: row.status,
      createdTechnician: row.created_technician,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      notifiedDate: row.notified_date,
      approvedDate: row.approved_date
    });

  } catch (error) {
    console.error('Error updating estimate:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// DELETE /api/estimates/:id - Delete an estimate
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM estimates WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    res.json({ message: 'Estimate deleted successfully' });
  } catch (error) {
    console.error('Error deleting estimate:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;

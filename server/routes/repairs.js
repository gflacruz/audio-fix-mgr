const express = require("express");
const router = express.Router();
const db = require("../db");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const nodemailer = require("nodemailer");
const dns = require("dns");
const util = require("util");
const twilio = require("twilio");
const { verifyToken } = require("../middleware/auth");

const lookup = util.promisify(dns.lookup);

// Configure Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// GET /api/repairs - List all repairs
router.get("/", async (req, res) => {
  try {
    const { clientId, search, includeClosed } = req.query;
    let query = `
      SELECT r.*, c.name as client_name, c.company_name as client_company, c.phone as client_phone,
      COALESCE((SELECT SUM(rp.quantity * rp.unit_price) FROM repair_parts rp WHERE rp.repair_id = r.id), 0) as parts_cost
      FROM repairs r 
      JOIN clients c ON r.client_id = c.id 
    `;
    const params = [];
    let whereClauses = [];
    let paramIndex = 1;

    if (clientId) {
      whereClauses.push(`r.client_id = $${paramIndex}`);
      params.push(clientId);
      paramIndex++;
    }

    if (search) {
      const searchPattern = `%${search}%`;
      whereClauses.push(`(
        r.brand ILIKE $${paramIndex} OR 
        r.model ILIKE $${paramIndex} OR 
        r.serial ILIKE $${paramIndex} OR 
        CAST(r.claim_number AS TEXT) ILIKE $${paramIndex} OR
        c.name ILIKE $${paramIndex} OR
        c.company_name ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex}
      )`);
      params.push(searchPattern);
      paramIndex++;
    }

    // Filter closed units if includeClosed is explicitly false
    if (includeClosed === "false") {
      whereClauses.push(`r.status != 'closed'`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    query += " ORDER BY r.created_at DESC";

    const result = await db.query(query, params);

    // Map snake_case DB fields to camelCase for frontend compatibility if needed
    // But for now, let's stick to what the DB returns and we'll adjust the frontend adapter later.
    // Actually, to make Phase 3 easier, let's map keys here or use "AS" in SQL.
    // Current frontend expects camelCase (e.g. clientName, claimNumber).

    const formatted = result.rows.map((row) => ({
      id: row.id,
      claimNumber: row.claim_number,
      clientId: row.client_id,
      clientName: row.client_name,
      clientCompany: row.client_company,
      brand: row.brand,
      model: row.model,
      serial: row.serial,
      unitType: row.unit_type,
      issue: row.issue,
      priority: row.priority,
      status: row.status,
      technician: row.technician,
      checkedInBy: row.checked_in_by,
      dateIn: row.created_at, // Map created_at to dateIn
      completedDate: row.completed_date,
      closedDate: row.closed_date,
      diagnosticFeeCollected: row.diagnostic_fee_collected,
      diagnosticFee: parseFloat(row.diagnostic_fee) || 0,
      depositAmount: parseFloat(row.deposit_amount) || 0,
      rushFee: parseFloat(row.rush_fee) || 0,
      onSiteFee: parseFloat(row.on_site_fee) || 0,
      partsCost: parseFloat(row.parts_cost) || 0,
      laborCost: parseFloat(row.labor_cost) || 0,
      isOnSite: row.is_on_site,
      isTaxExempt: row.is_tax_exempt,
      isShippedIn: row.is_shipped_in,
      shippingCarrier: row.shipping_carrier,
      boxHeight: row.box_height,
      boxLength: row.box_length,
      boxWidth: row.box_width,
      modelVersion: row.model_version,
      accessoriesIncluded: row.accessories_included,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching repairs:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// GET /api/repairs/payroll - List unpaid closed repairs
router.get("/payroll", async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id, r.claim_number, r.brand, r.model, r.technician, 
        r.labor_cost, r.diagnostic_fee_collected, r.deposit_amount, r.diagnostic_fee, r.created_at, r.is_tax_exempt,
        COALESCE(SUM(rp.quantity * rp.unit_price), 0) as parts_cost
      FROM repairs r
      LEFT JOIN repair_parts rp ON r.id = rp.repair_id
      WHERE r.status = 'closed' AND (r.paid_out IS FALSE OR r.paid_out IS NULL)
      GROUP BY r.id
      ORDER BY r.technician, r.created_at DESC
    `;

    const result = await db.query(query);

    const formatted = result.rows.map((row) => {
      const labor = parseFloat(row.labor_cost) || 0;
      const parts = parseFloat(row.parts_cost) || 0;
      
      // Calculate Diag Fee (Deposit) logic: Deposit > DiagFee > 89 default
      let diagFeeVal = 0;
      const deposit = parseFloat(row.deposit_amount);
      const recordedFee = parseFloat(row.diagnostic_fee);

      if (!isNaN(deposit) && deposit > 0) {
        diagFeeVal = deposit;
      } else if (!isNaN(recordedFee) && recordedFee > 0) {
        diagFeeVal = recordedFee;
      } else if (row.diagnostic_fee_collected) {
        diagFeeVal = 89.0;
      }
      const diagFee = diagFeeVal;
      
      const tax = row.is_tax_exempt ? 0 : (labor + parts) * 0.075;
      const total = labor + parts + diagFee + tax;

      return {
        id: row.id,
        claimNumber: row.claim_number,
        brand: row.brand,
        model: row.model,
        technician: row.technician,
        laborCost: labor,
        partsCost: parts,
        tax: tax,
        diagnosticFee: diagFee,
        totalCost: total,
        commission: labor * 0.5,
        date: row.created_at,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching payroll:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/repairs/payroll-history - List paid out repairs with filters
router.get("/payroll-history", async (req, res) => {
  try {
    const { technician, startDate, endDate } = req.query;

    // We prefer paid_to if available (for historical accuracy), otherwise fallback to technician
    let query = `
      SELECT 
        r.id, r.claim_number, r.brand, r.model, 
        COALESCE(r.paid_to, r.technician) as technician_paid,
        r.labor_cost, r.diagnostic_fee_collected, r.deposit_amount, r.diagnostic_fee, r.created_at, r.paid_out_date, r.is_tax_exempt,
        COALESCE(SUM(rp.quantity * rp.unit_price), 0) as parts_cost
      FROM repairs r
      LEFT JOIN repair_parts rp ON r.id = rp.repair_id
      WHERE r.paid_out = TRUE
    `;

    const params = [];
    let paramIndex = 1;

    if (technician && technician !== "all") {
      // Check against paid_to if set, otherwise technician
      query += ` AND COALESCE(r.paid_to, r.technician) = $${paramIndex}`;
      params.push(technician);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND r.paid_out_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND r.paid_out_date < ($${paramIndex}::date + INTERVAL '1 day')`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` GROUP BY r.id ORDER BY r.paid_out_date DESC`;

    const result = await db.query(query, params);

    const formatted = result.rows.map((row) => {
      const labor = parseFloat(row.labor_cost) || 0;
      const parts = parseFloat(row.parts_cost) || 0;
      
      // Calculate Diag Fee (Deposit) logic: Deposit > DiagFee > 89 default
      let diagFeeVal = 0;
      const deposit = parseFloat(row.deposit_amount);
      const recordedFee = parseFloat(row.diagnostic_fee);

      if (!isNaN(deposit) && deposit > 0) {
        diagFeeVal = deposit;
      } else if (!isNaN(recordedFee) && recordedFee > 0) {
        diagFeeVal = recordedFee;
      } else if (row.diagnostic_fee_collected) {
        diagFeeVal = 89.0;
      }
      const diagFee = diagFeeVal;
      
      const tax = row.is_tax_exempt ? 0 : (labor + parts) * 0.075;
      const total = labor + parts + diagFee + tax;

      return {
        id: row.id,
        claimNumber: row.claim_number,
        brand: row.brand,
        model: row.model,
        technician: row.technician_paid, // Use the resolved name
        laborCost: labor,
        partsCost: parts,
        tax: tax,
        diagnosticFee: diagFee,
        totalCost: total,
        commission: labor * 0.5,
        date: row.created_at,
        paidOutDate: row.paid_out_date,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching payroll history:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// POST /api/repairs/payout - Mark repairs as paid
router.post("/payout", async (req, res) => {
  try {
    const { repairIds } = req.body;
    if (!repairIds || !Array.isArray(repairIds) || repairIds.length === 0) {
      return res.status(400).json({ error: "No repair IDs provided" });
    }

    // Set paid_out, paid_out_date, and copy technician to paid_to
    const query = `
      UPDATE repairs 
      SET paid_out = TRUE, 
          paid_out_date = NOW(),
          paid_to = technician
      WHERE id = ANY($1)
    `;

    await db.query(query, [repairIds]);
    res.json({ message: "Repairs marked as paid" });
  } catch (error) {
    console.error("Error processing payout:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// GET /api/repairs/:id - Get single repair with details and notes
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch Repair + Client info
    const repairQuery = `
      SELECT r.*, 
             c.name as client_name, c.company_name as client_company, c.phone as client_phone, c.email as client_email,
             c.address as client_address, c.city as client_city, c.state as client_state, c.zip as client_zip,
             c.primary_notification
      FROM repairs r 

      JOIN clients c ON r.client_id = c.id 
      WHERE r.id = $1
    `;

    const repairResult = await db.query(repairQuery, [id]);

    if (repairResult.rows.length === 0) {
      return res.status(404).json({ error: "Repair not found" });
    }

    const row = repairResult.rows[0];

    // Fetch Client Phones
    const phonesResult = await db.query(
      "SELECT * FROM client_phones WHERE client_id = $1 ORDER BY is_primary DESC",
      [row.client_id],
    );

    const clientPhones = phonesResult.rows.map((p) => ({
      number: p.phone_number,
      type: p.type,
      extension: p.extension,
      isPrimary: p.is_primary,
    }));

    // Fetch Notes
    const notesResult = await db.query(
      "SELECT * FROM repair_notes WHERE repair_id = $1 ORDER BY created_at ASC",
      [id],
    );

    // Fetch Parts
    const partsResult = await db.query(
      `SELECT rp.*, p.name as inventory_name, p.retail_price as current_retail, p.wholesale_price as current_wholesale
       FROM repair_parts rp
       LEFT JOIN parts p ON rp.part_id = p.id
       WHERE rp.repair_id = $1
       ORDER BY rp.created_at ASC`,
      [id],
    );

    // Fetch Photos
    const photosResult = await db.query(
      "SELECT * FROM repair_photos WHERE repair_id = $1 ORDER BY created_at DESC",
      [id],
    );

    // Format Response
    const ticket = {
      id: row.id,

      claimNumber: row.claim_number,
      clientId: row.client_id,
      clientName: row.client_name,
      // Include full client object for the Detail View
      client: {
        id: row.client_id,
        name: row.client_name,
        companyName: row.client_company,
        phone: row.client_phone,
        phones: clientPhones,
        email: row.client_email,
        address: row.client_address,
        city: row.client_city,
        state: row.client_state,
        zip: row.client_zip,
        primaryNotification: row.primary_notification
      },

      brand: row.brand,
      model: row.model,
      serial: row.serial,
      unitType: row.unit_type,
      issue: row.issue,
      priority: row.priority,
      status: row.status,
      technician: row.technician,
      checkedInBy: row.checked_in_by,
      dateIn: row.created_at,
      completedDate: row.completed_date,
      closedDate: row.closed_date,
      diagnosticFeeCollected: row.diagnostic_fee_collected,
      diagnosticFee: parseFloat(row.diagnostic_fee) || 0,
      depositAmount: parseFloat(row.deposit_amount) || 0,
      rushFee: parseFloat(row.rush_fee) || 0,
      onSiteFee: parseFloat(row.on_site_fee) || 0,
      isOnSite: row.is_on_site,
      isTaxExempt: row.is_tax_exempt,
      isShippedIn: row.is_shipped_in,
      shippingCarrier: row.shipping_carrier,
      boxHeight: row.box_height,
      boxLength: row.box_length,
      boxWidth: row.box_width,
      modelVersion: row.model_version,
      accessoriesIncluded: row.accessories_included,
      workPerformed: row.work_performed,
      laborCost: parseFloat(row.labor_cost) || 0,
      returnShippingCost: parseFloat(row.return_shipping_cost) || 0,
      returnShippingCarrier: row.return_shipping_carrier,
      notes: notesResult.rows.map((n) => ({
        id: n.id,
        text: n.text,
        author: n.author,
        date: n.created_at,
      })),
      parts: partsResult.rows.map((p) => ({
        id: p.id, // repair_part link id
        partId: p.part_id,
        name: p.name || p.inventory_name,
        quantity: p.quantity,
        price: parseFloat(p.unit_price),
        retailPrice: parseFloat(p.current_retail) || 0,
        wholesalePrice: parseFloat(p.current_wholesale) || 0,
        total: parseFloat(p.unit_price) * p.quantity,
      })),
      photos: photosResult.rows.map((ph) => ({
        id: ph.id,
        url: ph.url,
        publicId: ph.public_id,
        date: ph.created_at,
      })),
    };

    res.json(ticket);
  } catch (error) {
    console.error("Error fetching repair detail:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// POST /api/repairs - Create new repair ticket
router.post("/", async (req, res) => {
  try {
    const {
      clientId,
      brand,
      model,
      serial,
      unitType,
      issue,
      priority,
      technician,
      diagnosticFeeCollected,
      diagnosticFee,
      rushFee,
      onSiteFee,
      isOnSite,
      isShippedIn,
      shippingCarrier,
      boxHeight,
      boxLength,
      boxWidth,
      modelVersion,
      accessoriesIncluded,
      checkedInBy,
      status,
    } = req.body;

    if (!clientId || !brand || !model || !issue) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate Claim Number (YY-NNNN)
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const searchPattern = `${year}-%`;

    const lastClaimResult = await db.query(
      `SELECT claim_number FROM repairs WHERE claim_number LIKE $1 ORDER BY id DESC LIMIT 1`,
      [searchPattern]
    );

    let nextSequence = 1;
    if (lastClaimResult.rows.length > 0) {
      const lastClaim = lastClaimResult.rows[0].claim_number;
      // Ensure we are parsing a format we expect (YY-NNNN)
      const parts = lastClaim.split('-');
      if (parts.length === 2 && !isNaN(parts[1])) {
        nextSequence = parseInt(parts[1], 10) + 1;
      }
    }

    const newClaimNumber = `${year}-${nextSequence.toString().padStart(4, '0')}`;

    const result = await db.query(
      `INSERT INTO repairs 
       (client_id, brand, model, serial, unit_type, issue, priority, technician, diagnostic_fee_collected, diagnostic_fee, rush_fee, on_site_fee, is_shipped_in, shipping_carrier, box_height, box_length, box_width, model_version, accessories_included, is_on_site, claim_number, checked_in_by, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) 
       RETURNING *`,
      [
        clientId,
        brand,
        model,
        serial,
        unitType,
        issue,
        priority || "normal",
        technician || "Unassigned",
        diagnosticFeeCollected || false,
        diagnosticFee || 0,
        rushFee || 0,
        onSiteFee || 0,
        isShippedIn || false,
        shippingCarrier || null,
        boxHeight || null,
        boxLength || null,
        boxWidth || null,
        modelVersion || null,
        accessoriesIncluded || null,
        isOnSite || false,
        newClaimNumber,
        checkedInBy || null,
        status || 'queued'
      ],
    );

    const row = result.rows[0];

    // Return frontend-friendly format
    res.status(201).json({
      id: row.id,
      claimNumber: row.claim_number,
      status: row.status,
      // ... include other fields if immediate feedback is needed
    });
  } catch (error) {
    console.error("Error creating repair:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// PATCH /api/repairs/:id - Update repair details
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Whitelist allowed fields to prevent arbitrary updates
    const allowedFields = [
      "status",
      "technician",
      "priority",
      "diagnosticFeeCollected",
      "diagnosticFee",
      "depositAmount",
      "rushFee",
      "onSiteFee",
      "isOnSite",
      "issue",
      "modelVersion",
      "accessoriesIncluded",
      "isShippedIn",
      "shippingCarrier",
      "boxHeight",
      "boxLength",
      "boxWidth",
      "workPerformed",
      "laborCost",
      "returnShippingCost",
      "returnShippingCarrier",
      "isTaxExempt",
      "brand",
      "model",
      "serial",
    ];

    // Auto-update dates based on status changes
    if (updates.status === "ready") {
      updates.completedDate = new Date().toISOString();
      allowedFields.push("completedDate");
    } else if (updates.status === "closed") {
      updates.closedDate = new Date().toISOString();
      allowedFields.push("closedDate");
    } else if (
      updates.status &&
      updates.status !== "ready" &&
      updates.status !== "closed"
    ) {
      // Only clear them if explicitly desired?
      // Usually moving back from Closed -> Ready might keep closed date?
      // Let's assume moving backwards clears the future dates.
      if (updates.status === "repairing" || updates.status === "diagnosing") {
        // We could clear them, but standard SQL updates would need NULL.
        // For now, let's just track the timestamp when it *becomes* that status.
      }
    }

    const fieldsToUpdate = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        // Map camelCase to snake_case
        const dbField = key.replace(
          /[A-Z]/g,
          (letter) => `_${letter.toLowerCase()}`,
        );
        fieldsToUpdate.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id);
    const query = `UPDATE repairs SET ${fieldsToUpdate.join(", ")} WHERE id = $${paramIndex} RETURNING *`;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Repair not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating repair:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// GET /api/repairs/:id/notes - Get only notes (lightweight)
router.get("/:id/notes", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "SELECT * FROM repair_notes WHERE repair_id = $1 ORDER BY created_at ASC",
      [id]
    );

    const notes = result.rows.map((n) => ({
      id: n.id,
      text: n.text,
      author: n.author,
      date: n.created_at,
    }));

    res.json(notes);
  } catch (error) {
    console.error("Error fetching repair notes:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// POST /api/repairs/:id/notes - Add a note
router.post("/:id/notes", async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Note text is required" });
    }

    const result = await db.query(
      `INSERT INTO repair_notes (repair_id, text, author) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [id, text, author || "System"],
    );

    const note = result.rows[0];
    res.status(201).json({
      id: note.id,
      text: note.text,
      author: note.author,
      date: note.created_at,
    });
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// POST /api/repairs/:id/parts - Add part to repair
router.post("/:id/parts", async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { partId, quantity, name, price } = req.body;
    const qty = quantity || 1;

    await client.query("BEGIN");

    let finalPrice = 0;
    let finalName = "";
    let finalPartId = null;

    if (partId) {
      // Check part existence and stock
      const partRes = await client.query(
        "SELECT name, retail_price, quantity_in_stock FROM parts WHERE id = $1",
        [partId],
      );
      if (partRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Part not found" });
      }

      const part = partRes.rows[0];
      if (part.quantity_in_stock < qty) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({
            error: `Not enough stock. Available: ${part.quantity_in_stock}`,
          });
      }

      // Deduct stock
      await client.query(
        "UPDATE parts SET quantity_in_stock = quantity_in_stock - $1 WHERE id = $2",
        [qty, partId],
      );

      finalName = part.name;
      finalPartId = partId;
      
      // Use provided price (e.g. 0 for warranty/inventory only) or default to retail
      if (price !== undefined && price !== null && price !== "") {
        finalPrice = price;
      } else {
        finalPrice = part.retail_price;
      }
    } else {
      // Custom Part Logic
      if (!name || !price) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: "Name and Price are required for custom parts." });
      }
      finalName = name;
      finalPrice = price;
      finalPartId = null;
    }

    // Add to repair
    const result = await client.query(
      `INSERT INTO repair_parts (repair_id, part_id, quantity, unit_price, name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, finalPartId, qty, finalPrice, finalName],
    );

    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error adding part to repair:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  } finally {
    client.release();
  }
});

// DELETE /api/repairs/:id/parts/:linkId - Remove part from repair
router.delete("/:id/parts/:linkId", async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { linkId } = req.params;

    await client.query("BEGIN");

    // Get the part link to know what to restore
    const linkRes = await client.query(
      "SELECT part_id, quantity FROM repair_parts WHERE id = $1",
      [linkId],
    );

    if (linkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Repair part link not found" });
    }

    const { part_id, quantity } = linkRes.rows[0];

    // Restore stock
    await client.query(
      "UPDATE parts SET quantity_in_stock = quantity_in_stock + $1 WHERE id = $2",
      [quantity, part_id],
    );

    // Remove link
    await client.query("DELETE FROM repair_parts WHERE id = $1", [linkId]);

    await client.query("COMMIT");
    res.json({ message: "Part removed and stock restored" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error removing part:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  } finally {
    client.release();
  }
});

// POST /api/repairs/:id/photos - Upload a photo
router.post("/:id/photos", upload.single("photo"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded" });
    }

    // Upload to Cloudinary using stream
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "audio_fix_repairs" },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ error: "Image upload failed" });
        }

        try {
          // Save to DB
          const dbResult = await db.query(
            `INSERT INTO repair_photos (repair_id, url, public_id) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [id, result.secure_url, result.public_id],
          );

          const photo = dbResult.rows[0];
          res.status(201).json({
            id: photo.id,
            url: photo.url,
            publicId: photo.public_id,
            date: photo.created_at,
          });
        } catch (dbError) {
          console.error("Database save error:", dbError);
          res.status(500).json({ error: "Database save failed" });
        }
      },
    );

    // Pipe the buffer to the upload stream
    const bufferStream = require("stream").Readable.from(req.file.buffer);
    bufferStream.pipe(uploadStream);
  } catch (error) {
    console.error("Error handling photo upload:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// DELETE /api/repairs/:id/photos/:photoId - Delete a photo
router.delete("/:id/photos/:photoId", async (req, res) => {
  try {
    const { photoId } = req.params;

    // Get public_id from DB first
    const photoRes = await db.query(
      "SELECT * FROM repair_photos WHERE id = $1",
      [photoId],
    );

    if (photoRes.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const photo = photoRes.rows[0];

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(photo.public_id);

    // Delete from DB
    await db.query("DELETE FROM repair_photos WHERE id = $1", [photoId]);

    res.json({ message: "Photo deleted" });
  } catch (error) {
    console.error("Error deleting photo:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Email Transporter Setup
const getTransporter = async () => {
  // Resolve Hostname Manually due to Local DNS issues
  const { address } = await lookup(process.env.SMTP_HOST);
  
  return nodemailer.createTransport({
    host: address, // Use resolved IP
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      servername: process.env.SMTP_HOST // Required for SSL verification
    },
  });
};

// Helper to calculate totals
const calculateTotals = (repair, parts) => {
  const partsTotal = parts.reduce(
    (sum, p) => sum + parseFloat(p.unit_price) * p.quantity,
    0,
  );
  const laborTotal = parseFloat(repair.labor_cost) || 0;
  const shippingTotal = parseFloat(repair.return_shipping_cost) || 0;
  const onSiteFee = parseFloat(repair.on_site_fee) || 0;
  const rushFee = parseFloat(repair.rush_fee) || 0;

  const tax = repair.is_tax_exempt ? 0 : (partsTotal + laborTotal) * 0.075;
  const total =
    partsTotal + laborTotal + shippingTotal + onSiteFee + rushFee + tax;

  const diagnosticFee = parseFloat(repair.diagnostic_fee) || 0;
  const amountDue = repair.diagnostic_fee_collected
    ? Math.max(0, total - diagnosticFee)
    : total;

  return { total, amountDue };
};

// POST /api/repairs/:id/email-estimate
router.post("/:id/email-estimate", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch repair info with client email
    const repairQuery = `
      SELECT r.*, c.email as client_email, c.name as client_name
      FROM repairs r 
      JOIN clients c ON r.client_id = c.id 
      WHERE r.id = $1
    `;
    const repairRes = await db.query(repairQuery, [id]);

    if (repairRes.rows.length === 0)
      return res.status(404).json({ error: "Repair not found" });
    const repair = repairRes.rows[0];

    if (!repair.client_email) {
      return res.status(400).json({ error: "Client has no email address" });
    }

    // Fetch Parts for total calculation
    const partsRes = await db.query(
      "SELECT * FROM repair_parts WHERE repair_id = $1",
      [id],
    );
    const { amountDue } = calculateTotals(repair, partsRes.rows);

    const transporter = await getTransporter();

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM || "Sound Technology Inc"}" <${process.env.SMTP_USER}>`,
      to: repair.client_email,
      subject: `Estimate for Repair #${repair.claim_number} - ${repair.brand} ${repair.model}`,
      text: `Hello ${repair.client_name},\n\nWe have completed the diagnosis of your ${repair.brand} ${repair.model}.\n\nThe estimated total for the repair is $${amountDue.toFixed(2)}.\n\nPlease reply to this email or call us to approve this work.\n\nThank you,\nSound Technology Inc`,
      html: `
        <p>Hello ${repair.client_name},</p>
        <p>We have completed the diagnosis of your <strong>${repair.brand} ${repair.model}</strong>.</p>
        <p>The estimated total for the repair is <strong>$${amountDue.toFixed(2)}</strong>.</p>
        <p>Please reply to this email or call us at (813) 985-1120 to approve this work.</p>
        <br/>
        <p>Thank you,</p>
        <p>Sound Technology Inc</p>
      `,
    });

    res.json({ message: "Estimate email sent" });
  } catch (error) {
    console.error("Error sending estimate email:", error);
    res.status(500).json({ error: "Failed to send email: " + error.message });
  }
});

// POST /api/repairs/:id/email-pickup
router.post("/:id/email-pickup", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const repairQuery = `
      SELECT r.*, c.email as client_email, c.name as client_name
      FROM repairs r 
      JOIN clients c ON r.client_id = c.id 
      WHERE r.id = $1
    `;
    const repairRes = await db.query(repairQuery, [id]);

    if (repairRes.rows.length === 0)
      return res.status(404).json({ error: "Repair not found" });
    const repair = repairRes.rows[0];

    if (!repair.client_email) {
      return res.status(400).json({ error: "Client has no email address" });
    }

    const partsRes = await db.query(
      "SELECT * FROM repair_parts WHERE repair_id = $1",
      [id],
    );
    const { amountDue } = calculateTotals(repair, partsRes.rows);

    const transporter = await getTransporter();

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM || "Sound Technology Inc"}" <${process.env.SMTP_USER}>`,
      to: repair.client_email,
      subject: `Ready for Pickup - Repair #${repair.claim_number} - ${repair.brand} ${repair.model}`,
      text: `Hello ${repair.client_name},\n\nGood news! Your ${repair.brand} ${repair.model} is ready for pickup.\n\nThe final amount due is $${amountDue.toFixed(2)}.\n\nOur hours are 10am - 6pm Mon-Fri. Please come by at your earliest convenience.\n\nThank you,\nSound Technology Inc`,
      html: `
        <p>Hello ${repair.client_name},</p>
        <p>Good news! Your <strong>${repair.brand} ${repair.model}</strong> is ready for pickup.</p>
        <p>The final amount due is <strong>$${amountDue.toFixed(2)}</strong>.</p>
        <p>Our hours are 10am - 6pm Mon-Fri. Please come by at your earliest convenience or call us at (813) 985-1120.</p>
        <br/>
        <p>Thank you,</p>
        <p>Sound Technology Inc</p>
      `,
    });

    res.json({ message: "Pickup email sent" });
  } catch (error) {
    console.error("Error sending pickup email:", error);
    res.status(500).json({ error: "Failed to send email: " + error.message });
  }
});

// POST /api/repairs/:id/text-estimate
router.post("/:id/text-estimate", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!twilioClient) {
      return res.status(500).json({ error: "Twilio not configured on server" });
    }

    // Fetch repair info
    const repairQuery = `
      SELECT r.*, c.phone as client_phone, c.name as client_name, c.primary_notification
      FROM repairs r 
      JOIN clients c ON r.client_id = c.id 
      WHERE r.id = $1
    `;
    const repairRes = await db.query(repairQuery, [id]);

    if (repairRes.rows.length === 0)
      return res.status(404).json({ error: "Repair not found" });
    const repair = repairRes.rows[0];

    // Get Primary Phone from client_phones table if available, else fallback to legacy phone
    const phonesRes = await db.query(
      "SELECT phone_number FROM client_phones WHERE client_id = $1 AND is_primary = true",
      [repair.client_id]
    );
    
    let phoneNumber = repair.client_phone;
    if (phonesRes.rows.length > 0) {
      phoneNumber = phonesRes.rows[0].phone_number;
    }

    if (!phoneNumber) {
      return res.status(400).json({ error: "Client has no phone number" });
    }

    // Ensure phone number is E.164 format (US only assumption for now, or just prepend +1 if 10 digits)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;

    // Fetch Parts for total
    const partsRes = await db.query(
      "SELECT * FROM repair_parts WHERE repair_id = $1",
      [id],
    );
    const { amountDue } = calculateTotals(repair, partsRes.rows);

    await twilioClient.messages.create({
      body: `Hello ${repair.client_name}, STI here. Estimate for your ${repair.brand} ${repair.model} is $${amountDue.toFixed(2)}. Pls call (813) 985-1120 to approve.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    res.json({ message: "Estimate text sent" });
  } catch (error) {
    console.error("Error sending estimate text:", error);
    res.status(500).json({ error: "Failed to send text: " + error.message });
  }
});

// POST /api/repairs/:id/text-pickup
router.post("/:id/text-pickup", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!twilioClient) {
      return res.status(500).json({ error: "Twilio not configured on server" });
    }

    const repairQuery = `
      SELECT r.*, c.phone as client_phone, c.name as client_name
      FROM repairs r 
      JOIN clients c ON r.client_id = c.id 
      WHERE r.id = $1
    `;
    const repairRes = await db.query(repairQuery, [id]);

    if (repairRes.rows.length === 0)
      return res.status(404).json({ error: "Repair not found" });
    const repair = repairRes.rows[0];

    // Get Primary Phone
    const phonesRes = await db.query(
      "SELECT phone_number FROM client_phones WHERE client_id = $1 AND is_primary = true",
      [repair.client_id]
    );
    
    let phoneNumber = repair.client_phone;
    if (phonesRes.rows.length > 0) {
      phoneNumber = phonesRes.rows[0].phone_number;
    }

    if (!phoneNumber) {
      return res.status(400).json({ error: "Client has no phone number" });
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;

    const partsRes = await db.query(
      "SELECT * FROM repair_parts WHERE repair_id = $1",
      [id],
    );
    const { amountDue } = calculateTotals(repair, partsRes.rows);

    await twilioClient.messages.create({
      body: `Hello ${repair.client_name}, STI here. Your ${repair.brand} ${repair.model} is ready! Total: $${amountDue.toFixed(2)}. M-F 10-6.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    res.json({ message: "Pickup text sent" });
  } catch (error) {
    console.error("Error sending pickup text:", error);
    res.status(500).json({ error: "Failed to send text: " + error.message });
  }
});

// DELETE /api/repairs/:id - Delete a repair ticket
router.delete("/:id", verifyToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;

    // Fetch photos to delete from Cloudinary later
    const photosRes = await client.query("SELECT public_id FROM repair_photos WHERE repair_id = $1", [id]);
    const publicIds = photosRes.rows.map(p => p.public_id).filter(pid => pid);

    await client.query("BEGIN");

    // 1. Restore Inventory
    // Get all parts for this repair
    const partsRes = await client.query("SELECT part_id, quantity FROM repair_parts WHERE repair_id = $1 AND part_id IS NOT NULL", [id]);
    
    // Iterate and restore
    for (const part of partsRes.rows) {
       await client.query(
         "UPDATE parts SET quantity_in_stock = quantity_in_stock + $1 WHERE id = $2",
         [part.quantity, part.part_id]
       );
    }

    // 2. Delete Dependencies
    await client.query("DELETE FROM repair_parts WHERE repair_id = $1", [id]);
    await client.query("DELETE FROM repair_notes WHERE repair_id = $1", [id]);
    await client.query("DELETE FROM repair_photos WHERE repair_id = $1", [id]);

    // 3. Delete Repair
    const result = await client.query("DELETE FROM repairs WHERE id = $1 RETURNING id", [id]);

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Repair not found" });
    }

    await client.query("COMMIT");

    // 4. Cleanup Cloudinary (Best effort)
    for (const pid of publicIds) {
        try {
            await cloudinary.uploader.destroy(pid);
        } catch (e) {
            console.warn(`Failed to delete image ${pid}`, e);
        }
    }

    res.json({ message: "Repair deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting repair:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  } finally {
    client.release();
  }
});


module.exports = router;

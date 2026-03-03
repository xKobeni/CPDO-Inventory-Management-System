import mongoose from "mongoose";
import Item from "../models/Item.js";
import Transaction from "../models/Transaction.js";
import AuditLog from "../models/AuditLog.js";

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function listItems(req, res) {
  const { q, archived, type, category, status, assigned, page, pageSize } = req.query;

  const filter = {};
  const and = [];

  if (archived === "true") filter.isArchived = true;
  if (archived === "false") filter.isArchived = false;

  if (type) filter.itemType = type;
  if (category) filter.category = category;
  if (status) filter.status = status;

  if (q) {
    and.push({
      $or: [
        { name: new RegExp(q, "i") },
        { category: new RegExp(q, "i") },
        { propertyNumber: new RegExp(q, "i") },
        { serialNumber: new RegExp(q, "i") },
        { "accountablePerson.name": new RegExp(q, "i") },
        { division: new RegExp(q, "i") },
      ],
    });
  }

  // assigned: 'true' => has accountable person; 'false' => unassigned (no accountable person)
  if (assigned === "true") {
    and.push({ "accountablePerson.name": { $ne: "" } });
  } else if (assigned === "false") {
    and.push({ $or: [ { "accountablePerson.name": { $exists: false } }, { "accountablePerson.name": "" } ] });
  }

  // merge simple filters and and-clauses
  const finalFilter = { ...filter };
  if (and.length) finalFilter.$and = and;

  // pagination support (optional). Defaults: page=1, pageSize=500 (cap)
  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(500, Math.max(1, parseInt(pageSize, 10) || 500));
  const skip = (p - 1) * ps;

  const items = await Item.find(finalFilter)
    .select("name category itemType unit status condition propertyNumber serialNumber quantityOnHand reorderLevel accountablePerson createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(ps)
    .lean();
  res.json(items);
}

export async function lowStock(req, res) {
  // Supplies only, not archived, reorderLevel > 0, qty <= reorderLevel
  const items = await Item.find({
    itemType: "SUPPLY",
    isArchived: false,
    reorderLevel: { $gt: 0 },
    $expr: { $lte: ["$quantityOnHand", "$reorderLevel"] },
  })
    .select("name category unit quantityOnHand reorderLevel updatedAt")
    .sort({ quantityOnHand: 1, updatedAt: -1 })
    .limit(300)
    .lean();

  res.json(items);
}

export async function createItem(req, res) {
  const body = { ...req.body };

  // Normalize dates
  body.dateAcquired = toDateOrNull(body.dateAcquired);

  if (body.itemType === "ASSET") {
    const pn = body.propertyNumber?.trim();
    if (pn) {
      const existing = await Item.findOne({ propertyNumber: pn });
      if (existing) {
        return res.status(409).json({ message: "An item with this property number already exists" });
      }
    }
  }

  if (body.itemType === "SUPPLY") {
    body.propertyNumber = null;
  }

  const sn = body.serialNumber?.trim();
  if (sn) {
    const existing = await Item.findOne({ serialNumber: sn });
    if (existing) {
      return res.status(409).json({ message: "An item with this serial number already exists" });
    }
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const created = await Item.create([body], { session });
    const item = created[0];

    await AuditLog.create([
      {
        actorId: req.user._id,
        action: "ITEM_CREATE",
        targetType: "Item",
        targetId: item._id.toString(),
        meta: { name: item.name, itemType: item.itemType },
      },
    ], { session });

    if (item.itemType === "ASSET") {
      const accName = (item.accountablePerson?.name || "").trim();
      if (accName) {
        const accountablePerson = {
          name: accName,
          position: (item.accountablePerson?.position || "").trim(),
          office: (item.accountablePerson?.office || "CPDC").trim(),
        };

        const tx = await Transaction.create([
          {
            type: "ASSET_ASSIGN",
            items: [{ itemId: item._id, qty: 1 }],
            accountablePerson,
            issuedToOffice: accountablePerson.office,
            issuedToPerson: accountablePerson.name,
            purpose: req.body.purpose || req.body.remarks || "Asset assignment",
            createdBy: req.user._id,
          },
        ], { session });

        item.accountablePerson = { ...accountablePerson };
        item.status = "DEPLOYED";
        item.assignedDate = new Date();
        item.returnedDate = null;
        await item.save({ session });

        await AuditLog.create([
          {
            actorId: req.user._id,
            action: "ASSET_ASSIGN",
            targetType: "Item",
            targetId: item._id.toString(),
            meta: { to: accountablePerson, txId: tx[0]._id.toString(), source: "ITEM_CREATE" },
          },
        ], { session });
      }
    }

    await session.commitTransaction();
    res.status(201).json(item);
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

export async function updateItem(req, res) {
  const { id } = req.params;

  const patch = { ...req.body };
  if ("dateAcquired" in patch) patch.dateAcquired = toDateOrNull(patch.dateAcquired);

  // Safeguard: prevent direct edits to assignment/accountable fields here.
  // Assignment changes must go through assign/transfer/return flows which create
  // the corresponding Transaction records (single source of truth).
  const protectedFields = ["accountablePerson", "status", "assignedDate", "returnedDate", "transferredTo"];
  const attempted = Object.keys(patch).filter((k) => protectedFields.includes(k));
  if (attempted.length) {
    return res.status(400).json({
      message: `Direct edits to assignment-related fields are not allowed: ${attempted.join(", ")}. Use assign/transfer/return endpoints instead.`,
    });
  }

  const item = await Item.findById(id);
  if (!item) return res.status(404).json({ message: "Item not found" });

  // Track quantity change for SUPPLY items
  const oldQty = item.itemType === "SUPPLY" ? Number(item.quantityOnHand || 0) : null;
  const newQty = patch.quantityOnHand != null && item.itemType === "SUPPLY" ? Number(patch.quantityOnHand) : null;

  // Prevent changing type in a messy way (simple rule)
  if (patch.itemType && patch.itemType !== item.itemType) {
    // Allow but normalize:
    item.itemType = patch.itemType;
  }

  // Apply patch safely
  Object.keys(patch).forEach((k) => {
    item[k] = patch[k];
  });

  // Assets can now have quantity > 1 (no forced constraints)


  if (item.itemType === "SUPPLY") {
    item.propertyNumber = null;
  }

  const pn = item.propertyNumber?.trim();
  if (pn) {
    const existing = await Item.findOne({ propertyNumber: pn, _id: { $ne: item._id } });
    if (existing) {
      return res.status(409).json({ message: "An item with this property number already exists" });
    }
  }
  const sn = item.serialNumber?.trim();
  if (sn) {
    const existing = await Item.findOne({ serialNumber: sn, _id: { $ne: item._id } });
    if (existing) {
      return res.status(409).json({ message: "An item with this serial number already exists" });
    }
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await item.save({ session });

    // Create adjustment transaction if quantity changed for SUPPLY items
    if (oldQty !== null && newQty !== null && oldQty !== newQty) {
      const delta = newQty - oldQty;
      const absDelta = Math.abs(delta);
      
      await Transaction.create([{
        type: "ADJUSTMENT",
        items: [{ itemId: item._id, qty: absDelta }],
        purpose: `Manual quantity adjustment: ${oldQty} → ${newQty} (${delta > 0 ? '+' : ''}${delta})`,
        createdBy: req.user._id,
      }], { session });
    }

    await AuditLog.create([{
      actorId: req.user._id,
      action: "ITEM_UPDATE",
      targetType: "Item",
      targetId: item._id.toString(),
      meta: oldQty !== null && newQty !== null && oldQty !== newQty ? { qtyChange: { from: oldQty, to: newQty } } : {},
    }], { session });

    await session.commitTransaction();
    res.json(item);
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

export async function archiveItem(req, res) {
  const { id } = req.params;
  const item = await Item.findByIdAndUpdate(id, { isArchived: true }, { new: true });
  if (!item) return res.status(404).json({ message: "Item not found" });

  await AuditLog.create({
    actorId: req.user._id,
    action: "ITEM_ARCHIVE",
    targetType: "Item",
    targetId: item._id.toString(),
  });

  res.json(item);
}

export async function restoreItem(req, res) {
  const { id } = req.params;
  const item = await Item.findByIdAndUpdate(id, { isArchived: false }, { new: true });
  if (!item) return res.status(404).json({ message: "Item not found" });

  await AuditLog.create({
    actorId: req.user._id,
    action: "ITEM_RESTORE",
    targetType: "Item",
    targetId: item._id.toString(),
  });

  res.json(item);
}

export async function deleteItem(req, res) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { id } = req.params;
    const item = await Item.findById(id).session(session);
    if (!item) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Item not found" });
    }

    // Delete all related transactions
    const Transaction = (await import("../models/Transaction.js")).default;
    const deletedTxs = await Transaction.deleteMany(
      { "items.itemId": id },
      { session }
    );

    // Delete the item
    await item.deleteOne({ session });

    // Log the deletion
    await AuditLog.create(
      [{
        actorId: req.user._id,
        action: "ITEM_DELETE",
        targetType: "Item",
        targetId: item._id.toString(),
        meta: { 
          name: item.name, 
          category: item.category,
          deletedTransactions: deletedTxs.deletedCount 
        },
      }],
      { session }
    );

    await session.commitTransaction();
    res.json({ 
      message: "Item permanently deleted", 
      item,
      deletedTransactions: deletedTxs.deletedCount 
    });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// -------------------- ASSET ACTIONS --------------------

export async function assignAsset(req, res) {
  const { id } = req.params;

  const item = await Item.findById(id);
  if (!item) return res.status(404).json({ message: "Item not found" });
  if (item.itemType !== "ASSET") return res.status(400).json({ message: "Assign is for ASSET items only" });

  const acc = req.body.accountablePerson || {};
  const accountablePerson = {
    name: (acc.name || "").trim() || "",
    position: (acc.position || "").trim() || "",
    office: (acc.office || "CPDC").trim(),
  };

  // Transaction is the source of truth; create it first
  const tx = await Transaction.create({
    type: "ASSET_ASSIGN",
    items: [{ itemId: item._id, qty: 1 }],
    accountablePerson,
    issuedToOffice: accountablePerson.office,
    issuedToPerson: accountablePerson.name,
    purpose: req.body.purpose || "Asset assignment",
    createdBy: req.user._id,
  });

  // Item picks up from the transaction
  item.accountablePerson = { ...accountablePerson };
  item.division = req.body.division ?? item.division;
  item.remarks = req.body.remarks ?? item.remarks;
  item.status = "DEPLOYED";
  item.assignedDate = toDateOrNull(req.body.assignedDate) || new Date();
  item.returnedDate = null;
  await item.save();

  await AuditLog.create({
    actorId: req.user._id,
    action: "ASSET_ASSIGN",
    targetType: "Item",
    targetId: item._id.toString(),
    meta: { to: accountablePerson, txId: tx._id.toString() },
  });

  res.json(item);
}

export async function returnAsset(req, res) {
  const { id } = req.params;

  const item = await Item.findById(id);
  if (!item) return res.status(404).json({ message: "Item not found" });
  if (item.itemType !== "ASSET") return res.status(400).json({ message: "Return is for ASSET items only" });

  item.status = "IN_STOCK";
  item.returnedDate = toDateOrNull(req.body.returnedDate) || new Date();
  item.remarks = req.body.remarks ?? item.remarks;

  // keep accountable person record (optional). If you want to clear it:
  // item.accountablePerson = { name:"", position:"", office:"CPDC" };

  await item.save();

  const tx = await Transaction.create({
    type: "ASSET_RETURN",
    items: [{ itemId: item._id, qty: 1 }],
    createdBy: req.user._id,
    purpose: "Asset return",
  });

  await AuditLog.create({
    actorId: req.user._id,
    action: "ASSET_RETURN",
    targetType: "Item",
    targetId: item._id.toString(),
    meta: { txId: tx._id.toString() },
  });

  res.json(item);
}

export async function transferAsset(req, res) {
  const { id } = req.params;

  const item = await Item.findById(id);
  if (!item) return res.status(404).json({ message: "Item not found" });
  if (item.itemType !== "ASSET") return res.status(400).json({ message: "Transfer is for ASSET items only" });

  // keep previous accountable person (do not overwrite)
  const before = item.accountablePerson;

  // transfer recipient is supplied as `transferredTo` in the body (string)
  const transferredTo = (req.body.transferredTo || "").trim();

  let tx = null
  // If txId provided, update that transaction (no new transaction should be created)
  if (req.body.txId) {
    try {
      tx = await Transaction.findById(req.body.txId);
      if (tx) {
        // update issuedTo fields if present
        tx.issuedToPerson = transferredTo || req.body.issuedToPerson || tx.issuedToPerson;
        tx.issuedToOffice = req.body.office || tx.issuedToOffice;
        tx.purpose = req.body.purpose || req.body.remarks || tx.purpose;
        await tx.save();
      }
    } catch (e) {
      // ignore and fall back to create below
      tx = null
    }
  }

  // create a transaction record for audit/history only if we didn't update an existing one
  if (!tx) {
    tx = await Transaction.create({
      type: "ASSET_TRANSFER",
      items: [{ itemId: item._id, qty: 1 }],
      issuedToOffice: req.body.office || undefined,
      issuedToPerson: transferredTo || req.body.issuedToPerson || undefined,
      purpose: req.body.purpose || req.body.remarks || "Asset transfer",
      createdBy: req.user._id,
    });
  }

  // Item: do NOT change accountablePerson. Instead set transferredTo and update optional fields.
  item.transferredTo = transferredTo || item.transferredTo;
  item.division = req.body.division ?? item.division;
  item.remarks = req.body.remarks ?? item.remarks;
  // keep status/assignedDate as-is (do not reassign accountablePerson)
  await item.save();

  await AuditLog.create({
    actorId: req.user._id,
    action: "ASSET_TRANSFER",
    targetType: "Item",
    targetId: item._id.toString(),
    meta: { before, transferredTo: item.transferredTo, txId: tx._id.toString() },
  });

  res.json(item);
}
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Item from "../models/Item.js";
import AuditLog from "../models/AuditLog.js";

async function applyStockChange(session, items, direction) {
  // direction: +1 for STOCK_IN, -1 for ISSUANCE
  for (const line of items) {
    const item = await Item.findById(line.itemId).session(session);
    if (!item) throw Object.assign(new Error("Item not found"), { status: 404 });

    const nextQty = item.quantityOnHand + direction * line.qty;
    if (nextQty < 0) throw Object.assign(new Error(`Insufficient stock for ${item.name}`), { status: 400 });

    item.quantityOnHand = nextQty;
    await item.save({ session });

    if (item.itemType === "ASSET") {
      throw Object.assign(new Error(`Cannot change stock for ASSET item ${item.name}. Use assign/transfer/return.`), {
        status: 400,
      });
    }
  }
}

/** Apply transaction's accountablePerson to an item (single source of truth). */
function accountableFromTx(tx) {
  const acc = tx.accountablePerson || {};
  return {
    name: acc.name || tx.issuedToPerson || "",
    position: acc.position || "",
    office: acc.office || tx.issuedToOffice || "CPDC",
  };
}

async function applyAccountableToItems(session, tx, itemIds) {
  const acc = accountableFromTx(tx);
  for (const id of itemIds) {
    const item = await Item.findById(id).session(session);
    if (!item) continue;
    item.accountablePerson = { ...acc };
    await item.save({ session });
  }
}

export async function listTransactions(req, res) {
  const { type } = req.query;
  const filter = {};
  if (type) {
    const types = typeof type === "string" ? type.split(",").map((t) => t.trim()).filter(Boolean) : [type]
    if (types.length === 1) filter.type = types[0]
    else if (types.length > 1) filter.type = { $in: types }
  }

  const txs = await Transaction.find(filter)
    .populate("createdBy", "name email role")
    .populate("items.itemId", "name unit category itemType dateAcquired unitCost propertyNumber accountablePerson transferredTo")
    .sort({ createdAt: -1 })
    .limit(300);

  res.json(txs);
}

export async function createStockIn(req, res) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const tx = await Transaction.create(
      [{
        type: "STOCK_IN",
        items: req.body.items,
        supplier: req.body.supplier,
        referenceNo: req.body.referenceNo,
        createdBy: req.user._id,
      }],
      { session }
    );

    await applyStockChange(session, req.body.items, +1);

    await AuditLog.create([{
      actorId: req.user._id,
      action: "STOCK_IN_CREATE",
      targetType: "Transaction",
      targetId: tx[0]._id.toString(),
      meta: { referenceNo: req.body.referenceNo || null },
    }], { session });

    await session.commitTransaction();
    res.status(201).json(tx[0]);
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

export async function createIssuance(req, res) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const acc = req.body.accountablePerson || {};
    const accountablePerson = {
      name: (acc.name || req.body.issuedToPerson || "").trim() || undefined,
      position: (acc.position || "").trim() || undefined,
      office: (acc.office || req.body.issuedToOffice || "CPDC").trim(),
    };

    const tx = await Transaction.create(
      [{
        type: "ISSUANCE",
        items: req.body.items,
        accountablePerson,
        issuedToOffice: req.body.issuedToOffice ?? accountablePerson.office,
        issuedToPerson: req.body.issuedToPerson ?? accountablePerson.name,
        purpose: req.body.purpose,
        createdBy: req.user._id,
      }],
      { session }
    );

    await applyStockChange(session, req.body.items, -1);

    const itemIds = (req.body.items || []).map((line) => line.itemId);
    await applyAccountableToItems(session, tx[0], itemIds);

    await AuditLog.create([{
      actorId: req.user._id,
      action: "ISSUANCE_CREATE",
      targetType: "Transaction",
      targetId: tx[0]._id.toString(),
      meta: { office: accountablePerson.office || null },
    }], { session });

    await session.commitTransaction();
    res.status(201).json(tx[0]);
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

/** Create ASSET_ASSIGN transaction(s); items get accountablePerson from the transaction (single source of truth). */
export async function createAssetAssign(req, res) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const acc = req.body.accountablePerson || {};
    const accountablePerson = {
      name: (acc.name || "").trim() || "",
      position: (acc.position || "").trim() || "",
      office: (acc.office || "CPDC").trim(),
    };

    const items = req.body.items || [];
    if (items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    const tx = await Transaction.create(
      [{
        type: "ASSET_ASSIGN",
        items: items.map((line) => ({ itemId: line.itemId, qty: line.qty ?? 1 })),
        accountablePerson,
        issuedToOffice: accountablePerson.office,
        issuedToPerson: accountablePerson.name,
        purpose: req.body.purpose || req.body.remarks || "Asset assignment",
        createdBy: req.user._id,
      }],
      { session }
    );

    const itemIds = items.map((line) => line.itemId);
    for (const id of itemIds) {
      const item = await Item.findById(id).session(session);
      if (!item) throw Object.assign(new Error(`Item not found: ${id}`), { status: 404 });
      if (item.itemType !== "ASSET") {
        throw Object.assign(new Error(`Item ${item.name} is not an asset. Use issuance for supplies.`), { status: 400 });
      }
      item.accountablePerson = { ...accountablePerson };
      item.remarks = req.body.remarks ?? item.remarks;
      item.status = "DEPLOYED";
      item.assignedDate = new Date();
      item.returnedDate = null;
      await item.save({ session });
    }

    await AuditLog.create([{
      actorId: req.user._id,
      action: "ASSET_ASSIGN",
      targetType: "Transaction",
      targetId: tx[0]._id.toString(),
      meta: { to: accountablePerson, itemCount: items.length },
    }], { session });

    await session.commitTransaction();
    res.status(201).json(tx[0]);
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

/** Delete an ISSUANCE (return stock) or ASSET_ASSIGN (revert item assignment) transaction. */
export async function deleteIssuance(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid transaction id" });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const tx = await Transaction.findById(id).session(session);
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    if (tx.type !== "ISSUANCE" && tx.type !== "ASSET_ASSIGN") {
      return res.status(400).json({ message: "Only issuance or asset-assign transactions can be removed" });
    }

    if (tx.type === "ISSUANCE") {
      const itemsToReverse = (tx.items || []).map((line) => ({
        itemId: line.itemId?.toString?.() ?? line.itemId,
        qty: line.qty,
      }));
      await applyStockChange(session, itemsToReverse, +1);
    }

    if (tx.type === "ASSET_ASSIGN") {
      const itemIds = (tx.items || []).map((line) => line.itemId?.toString?.() ?? line.itemId).filter(Boolean);
      for (const itemId of itemIds) {
        const item = await Item.findById(itemId).session(session);
        if (!item) continue;
        item.accountablePerson = { name: "", position: "", office: "CPDC" };
        item.status = "IN_STOCK";
        item.assignedDate = null;
        item.returnedDate = null;
        await item.save({ session });
      }
    }

    await Transaction.findByIdAndDelete(id).session(session);

    await AuditLog.create([{
      actorId: req.user._id,
      action: tx.type === "ISSUANCE" ? "ISSUANCE_DELETE" : "ASSET_ASSIGN_DELETE",
      targetType: "Transaction",
      targetId: id,
      meta: tx.type === "ISSUANCE" ? { office: tx.issuedToOffice || null } : { itemCount: (tx.items || []).length },
    }], { session });

    await session.commitTransaction();
    return res.status(200).json({
      message: tx.type === "ISSUANCE" ? "Issuance removed" : "Asset assignment removed",
      id,
    });
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}
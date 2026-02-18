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
    if (nextQty < 0) throw Object.assign(new Error(`Insufficient stock for ${item.sku}`), { status: 400 });

    item.quantityOnHand = nextQty;
    await item.save({ session });

    // inside applyStockChange loop, after fetching item:
    if (item.itemType === "ASSET") {
      throw Object.assign(new Error(`Cannot change stock for ASSET item ${item.sku}. Use assign/transfer/return.`), {
        status: 400,
      });
    }
  }
}

export async function listTransactions(req, res) {
  const { type } = req.query;
  const filter = {};
  if (type) filter.type = type;

  const txs = await Transaction.find(filter)
    .populate("createdBy", "name email role")
    .populate("items.itemId", "sku name unit category")
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

    const tx = await Transaction.create(
      [{
        type: "ISSUANCE",
        items: req.body.items,
        issuedToOffice: req.body.issuedToOffice,
        issuedToPerson: req.body.issuedToPerson,
        purpose: req.body.purpose,
        createdBy: req.user._id,
      }],
      { session }
    );

    await applyStockChange(session, req.body.items, -1);

    await AuditLog.create([{
      actorId: req.user._id,
      action: "ISSUANCE_CREATE",
      targetType: "Transaction",
      targetId: tx[0]._id.toString(),
      meta: { office: req.body.issuedToOffice || null },
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
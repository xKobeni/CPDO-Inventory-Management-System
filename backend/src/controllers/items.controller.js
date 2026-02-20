import Item from "../models/Item.js";
import Transaction from "../models/Transaction.js";
import AuditLog from "../models/AuditLog.js";

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function listItems(req, res) {
  const { q, archived, type, category } = req.query;

  const filter = {};
  if (archived === "true") filter.isArchived = true;
  if (archived === "false") filter.isArchived = false;

  if (type) filter.itemType = type;
  if (category) filter.category = category;

  if (q) {
    filter.$or = [
      { name: new RegExp(q, "i") },
      { category: new RegExp(q, "i") },
      { propertyNumber: new RegExp(q, "i") },
      { serialNumber: new RegExp(q, "i") },
      { "accountablePerson.name": new RegExp(q, "i") },
      { division: new RegExp(q, "i") },
    ];
  }

  const items = await Item.find(filter).sort({ updatedAt: -1 }).limit(500);
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
    .sort({ quantityOnHand: 1, updatedAt: -1 })
    .limit(300);

  res.json(items);
}

export async function createItem(req, res) {
  const body = { ...req.body };

  // Normalize dates
  body.dateAcquired = toDateOrNull(body.dateAcquired);

  if (body.itemType === "ASSET") {
    body.quantityOnHand = 1;
    body.reorderLevel = 0;
  }

  if (body.itemType === "SUPPLY") {
    body.propertyNumber = null;
  }

  const item = await Item.create(body);

  await AuditLog.create({
    actorId: req.user._id,
    action: "ITEM_CREATE",
    targetType: "Item",
    targetId: item._id.toString(),
    meta: { name: item.name, itemType: item.itemType },
  });

  res.status(201).json(item);
}

export async function updateItem(req, res) {
  const { id } = req.params;

  const patch = { ...req.body };
  if ("dateAcquired" in patch) patch.dateAcquired = toDateOrNull(patch.dateAcquired);

  const item = await Item.findById(id);
  if (!item) return res.status(404).json({ message: "Item not found" });

  // Prevent changing type in a messy way (simple rule)
  if (patch.itemType && patch.itemType !== item.itemType) {
    // Allow but normalize:
    item.itemType = patch.itemType;
  }

  // Apply patch safely
  Object.keys(patch).forEach((k) => {
    item[k] = patch[k];
  });

  if (item.itemType === "ASSET") {
    item.quantityOnHand = 1;
    item.reorderLevel = 0;
  }

  if (item.itemType === "SUPPLY") {
    item.propertyNumber = null;
  }

  await item.save();

  await AuditLog.create({
    actorId: req.user._id,
    action: "ITEM_UPDATE",
    targetType: "Item",
    targetId: item._id.toString(),
  });

  res.json(item);
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

  const before = item.accountablePerson;
  const acc = req.body.accountablePerson || {};
  const accountablePerson = {
    name: (acc.name || "").trim() || "",
    position: (acc.position || "").trim() || "",
    office: (acc.office || "CPDC").trim(),
  };

  // Transaction is the source of truth; create it first
  const tx = await Transaction.create({
    type: "ASSET_TRANSFER",
    items: [{ itemId: item._id, qty: 1 }],
    accountablePerson,
    issuedToOffice: accountablePerson.office,
    issuedToPerson: accountablePerson.name,
    purpose: req.body.purpose || "Asset transfer",
    createdBy: req.user._id,
  });

  // Item picks up from the transaction
  item.accountablePerson = { ...accountablePerson };
  item.division = req.body.division ?? item.division;
  item.remarks = req.body.remarks ?? item.remarks;
  item.status = "DEPLOYED";
  item.assignedDate = new Date();
  item.returnedDate = null;
  await item.save();

  await AuditLog.create({
    actorId: req.user._id,
    action: "ASSET_TRANSFER",
    targetType: "Item",
    targetId: item._id.toString(),
    meta: { before, after: accountablePerson, txId: tx._id.toString() },
  });

  res.json(item);
}
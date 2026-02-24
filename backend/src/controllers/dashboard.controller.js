import mongoose from "mongoose";
import Item from "../models/Item.js";
import Transaction from "../models/Transaction.js";
import AuditLog from "../models/AuditLog.js";

export async function getDashboardSummary(req, res) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // ------------- KPI COUNTS -------------
  const [
    totalItems,
    activeItems,
    totalSupplies,
    totalAssets,
    archivedItems,
  ] = await Promise.all([
    Item.countDocuments({}),
    Item.countDocuments({ isArchived: false }),
    Item.countDocuments({ itemType: "SUPPLY", isArchived: false }),
    Item.countDocuments({ itemType: "ASSET", isArchived: false }),
    Item.countDocuments({ isArchived: true }),
  ]);

  // ------------- OUT OF STOCK (supplies with qty 0) -------------
  const outOfStockCount = await Item.countDocuments({
    itemType: "SUPPLY",
    isArchived: false,
    quantityOnHand: 0,
  });

  // ------------- LOW STOCK -------------
  // Supply only, reorderLevel > 0, qty <= reorderLevel
  const [lowStockCount, lowStockPreview] = await Promise.all([
    Item.countDocuments({
      itemType: "SUPPLY",
      isArchived: false,
      reorderLevel: { $gt: 0 },
      $expr: { $lte: ["$quantityOnHand", "$reorderLevel"] },
    }),
    Item.find({
      itemType: "SUPPLY",
      isArchived: false,
      reorderLevel: { $gt: 0 },
      $expr: { $lte: ["$quantityOnHand", "$reorderLevel"] },
    })
      .select("name category unit quantityOnHand reorderLevel updatedAt")
      .sort({ quantityOnHand: 1, updatedAt: -1 })
      .limit(8),
  ]);

  // ------------- ASSET BREAKDOWNS -------------
  const assetsByStatus = await Item.aggregate([
    { $match: { itemType: "ASSET", isArchived: false } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $project: { _id: 0, status: "$_id", count: 1 } },
    { $sort: { count: -1 } },
  ]);

  const assetsByCondition = await Item.aggregate([
    { $match: { itemType: "ASSET", isArchived: false } },
    { $group: { _id: "$condition", count: { $sum: 1 } } },
    { $project: { _id: 0, condition: "$_id", count: 1 } },
    { $sort: { count: -1 } },
  ]);

  // ------------- SUPPLY BREAKDOWNS -------------
  const suppliesByCategory = await Item.aggregate([
    { $match: { itemType: "SUPPLY", isArchived: false } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $project: { _id: 0, category: "$_id", count: 1 } },
    { $sort: { count: -1 } },
    { $limit: 12 },
  ]);

  // ------------- TRANSACTIONS -------------
  const startOf14DaysAgo = new Date(now);
  startOf14DaysAgo.setDate(startOf14DaysAgo.getDate() - 14);
  startOf14DaysAgo.setHours(0, 0, 0, 0);

  const [txToday, txThisMonth, recentTransactions, transactionsByDay] = await Promise.all([
    Transaction.countDocuments({ createdAt: { $gte: startOfToday } }),
    Transaction.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Transaction.find({})
      .populate("createdBy", "name role")
      .populate("items.itemId", "name unit category itemType propertyNumber")
      .sort({ createdAt: -1 })
      .limit(10),
    Transaction.aggregate([
      { $match: { createdAt: { $gte: startOf14DaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } },
    ]),
  ]);

  // ------------- AUDIT LOGS -------------
  const recentAuditLogs = await AuditLog.find({})
    .populate("actorId", "name role email")
    .sort({ createdAt: -1 })
    .limit(10);

  // ------------- OPTIONAL: QUICK “CARD” METRICS -------------
  // Assets deployed count
  const deployedAssets = await Item.countDocuments({
    itemType: "ASSET",
    isArchived: false,
    status: "DEPLOYED",
  });

  // Total supply quantity across all supplies (useful KPI)
  const supplyQtyAgg = await Item.aggregate([
    { $match: { itemType: "SUPPLY", isArchived: false } },
    { $group: { _id: null, totalQty: { $sum: "$quantityOnHand" } } },
    { $project: { _id: 0, totalQty: 1 } },
  ]);
  const totalSupplyQty = supplyQtyAgg?.[0]?.totalQty ?? 0;

  res.json({
    kpis: {
      totalItems,
      activeItems,
      archivedItems,
      totalSupplies,
      totalAssets,
      deployedAssets,
      outOfStockCount,
      lowStockCount,
      totalSupplyQty,
      txToday,
      txThisMonth,
    },
    charts: {
      assetsByStatus,
      assetsByCondition,
      suppliesByCategory,
      transactionsByDay,
    },
    previews: {
      lowStockPreview,
      recentTransactions,
      recentAuditLogs,
    },
  });
}

export async function getAuditLogs(req, res) {
  const logs = await AuditLog.find({})
    .populate("actorId", "name role email")
    .sort({ createdAt: -1 })
    .limit(10000);

  res.json(logs);
}

export async function getCategories(req, res) {
  // Returns categories currently used, useful for dropdown filters.
  // Optional query: ?type=SUPPLY|ASSET
  const { type } = req.query;

  const match = { isArchived: false };
  if (type) match.itemType = type;

  const cats = await Item.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        types: { $addToSet: "$itemType" },
      },
    },
    { $project: { _id: 0, category: "$_id", count: 1, types: 1 } },
    { $sort: { count: -1, category: 1 } },
  ]);

  // Helpful split lists too (common UI need)
  const [supplyCats, assetCats] = await Promise.all([
    Item.aggregate([
      { $match: { isArchived: false, itemType: "SUPPLY" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $project: { _id: 0, category: "$_id", count: 1 } },
      { $sort: { count: -1, category: 1 } },
    ]),
    Item.aggregate([
      { $match: { isArchived: false, itemType: "ASSET" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $project: { _id: 0, category: "$_id", count: 1 } },
      { $sort: { count: -1, category: 1 } },
    ]),
  ]);

  res.json({
    all: cats,
    supply: supplyCats,
    asset: assetCats,
  });
}

export async function getItemHistory(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid item id" });
  }

  const item = await Item.findById(id).select(
    "name itemType category unit propertyNumber serialNumber division status condition accountablePerson dateAcquired unitCost isArchived"
  );
  if (!item) return res.status(404).json({ message: "Item not found" });

  // Transactions that include this item
  const txs = await Transaction.find({ "items.itemId": id })
    .populate("createdBy", "name role")
    .populate("items.itemId", "name unit category itemType propertyNumber")
    .sort({ createdAt: -1 })
    .limit(200);

  // Audit logs that directly target this item
  const audits = await AuditLog.find({
    targetType: "Item",
    targetId: id,
  })
    .populate("actorId", "name role email")
    .sort({ createdAt: -1 })
    .limit(200);

  // Normalize a unified timeline (optional but very useful for UI)
  const timeline = [
    ...txs.map((t) => ({
      kind: "TRANSACTION",
      at: t.createdAt,
      type: t.type,
      by: t.createdBy ? { name: t.createdBy.name, role: t.createdBy.role } : null,
      details: {
        items: t.items
          .filter((x) => x.itemId && x.itemId._id.toString() === id)
          .map((x) => ({
            itemId: x.itemId._id,
            name: x.itemId.name,
            qty: x.qty,
            unit: x.itemId.unit,
            propertyNumber: x.itemId.propertyNumber || null,
          })),
        issuedToOffice: t.issuedToOffice || null,
        issuedToPerson: t.issuedToPerson || null,
        purpose: t.purpose || null,
        supplier: t.supplier || null,
        referenceNo: t.referenceNo || null,
      },
    })),
    ...audits.map((a) => ({
      kind: "AUDIT",
      at: a.createdAt,
      action: a.action,
      by: a.actorId ? { name: a.actorId.name, role: a.actorId.role, email: a.actorId.email } : null,
      details: {
        meta: a.meta || {},
        targetType: a.targetType,
        targetId: a.targetId,
      },
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  res.json({
    item,
    transactions: txs,
    auditLogs: audits,
    timeline,
  });
}
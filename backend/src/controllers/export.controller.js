import ExcelJS from "exceljs";
import { Parser as Json2CsvParser } from "json2csv";
import Item from "../models/Item.js";
import Transaction from "../models/Transaction.js";
import AuditLog from "../models/AuditLog.js";

function dateOnly(d) {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toISOString().slice(0, 10);
}

/** M/D/YYYY like the Report Results in the system (e.g. 2/24/2026) */
function dateReport(d) {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return `${x.getMonth() + 1}/${x.getDate()}/${x.getFullYear()}`;
}

/** Philippine Peso with commas (e.g. ₱10,000) */
function formatAmount(n) {
  if (n == null || Number.isNaN(Number(n))) return "₱0";
  return "₱" + Number(n).toLocaleString("en-PH", { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

/** Build the same filter as listItems so export matches what the frontend shows. */
function itemsFilterFromQuery(query) {
  const { q, archived, type, category } = query || {};
  const filter = {};
  if (archived === "true") filter.isArchived = true;
  else if (archived === "false" || archived === undefined) filter.isArchived = false;
  if (type) filter.itemType = type;
  if (category) filter.category = category;
  if (q && String(q).trim()) {
    const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");
    filter.$or = [
      { name: re },
      { category: re },
      { propertyNumber: re },
      { serialNumber: re },
      { "accountablePerson.name": re },
      { division: re },
    ];
  }
  return filter;
}

/** One row in Report Results format: Acquired Date, Item Name, Amount, Property, Accountable Person, Transferred To, Remarks */
function rowFromItem(it, txPurpose = "") {
  const acc = it.accountablePerson || {};
  const accPerson =
    acc?.name?.trim() || acc?.office?.trim()
      ? [acc?.name?.trim(), acc?.office?.trim()].filter(Boolean).join(" - ")
      : "";
  const transferredTo = it.transferredTo?.trim() || "None";
  return {
    acquiredDate: dateReport(it.dateAcquired),
    itemName: it.name || "",
    amount: formatAmount(it.unitCost),
    property: it.propertyNumber || "",
    accountablePerson: accPerson,
    transferredTo,
    remarks: it.remarks?.trim() || txPurpose || "",
  };
}

const REPORT_RESULTS_COLUMNS = [
  { header: "Acquired Date", key: "acquiredDate", width: 14 },
  { header: "Item Name", key: "itemName", width: 28 },
  { header: "Amount", key: "amount", width: 14 },
  { header: "Property", key: "property", width: 22 },
  { header: "Accountable Person", key: "accountablePerson", width: 28 },
  { header: "Transferred To", key: "transferredTo", width: 20 },
  { header: "Remarks", key: "remarks", width: 28 },
];

export async function exportItemsXlsx(req, res) {
  const filter = itemsFilterFromQuery(req.query);
  const items = await Item.find(filter).sort({ updatedAt: -1 }).limit(500).lean();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Items", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = REPORT_RESULTS_COLUMNS;
  items.forEach((it) => ws.addRow(rowFromItem(it)));

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="cpdc_items_${dateOnly(new Date())}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

export async function exportItemsCsv(req, res) {
  const filter = itemsFilterFromQuery(req.query);
  const items = await Item.find(filter).sort({ updatedAt: -1 }).limit(500).lean();

  const rows = items.map((it) => rowFromItem(it));

  const fields = [
    { label: "Acquired Date", value: "acquiredDate" },
    { label: "Item Name", value: "itemName" },
    { label: "Amount", value: "amount" },
    { label: "Property", value: "property" },
    { label: "Accountable Person", value: "accountablePerson" },
    { label: "Transferred To", value: "transferredTo" },
    { label: "Remarks", value: "remarks" },
  ];
  const parser = new Json2CsvParser({ fields });
  const csv = parser.parse(rows);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="cpdc_items_${dateOnly(new Date())}.csv"`);
  res.send(csv);
}

export async function exportTransactionsXlsx(req, res) {
  const { from, to, type } = req.query;

  const isIssuanceReport =
    type === "ISSUANCE" || type === "ASSET_ASSIGN" || type === "Issuance";

  if (isIssuanceReport) {
    const itemType = req.query.itemType;
    const category = req.query.category ? String(req.query.category).trim() : "";
    const accountablePerson = req.query.accountablePerson ? String(req.query.accountablePerson).trim() : "";
    const filter = { type: { $in: ["ISSUANCE", "ASSET_ASSIGN"] } };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const txs = await Transaction.find(filter)
      .populate("items.itemId")
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const rows = [];
    for (const t of txs) {
      const acc = t.accountablePerson || {};
      const accPerson =
        acc.name?.trim() || acc.office?.trim()
          ? [acc.name.trim(), acc.office.trim()].filter(Boolean).join(" - ")
          : "";
      const purpose = t.purpose?.trim() || "";
      if (accountablePerson) {
        const txAccName = (acc.name || "").trim() || (t.issuedToPerson || "").trim();
        const txMatches = txAccName === accountablePerson;
        if (!txMatches) {
          const itemMatches = (t.items || []).some(
            (line) => (line.itemId?.accountablePerson?.name || "").trim() === accountablePerson
          );
          if (!itemMatches) continue;
        }
      }
      for (const line of t.items || []) {
        const it = line?.itemId;
        if (!it) continue;
        if (itemType === "ASSET" || itemType === "SUPPLY") {
          if ((it.itemType || "") !== itemType) continue;
        }
        if (category && (it.category || "").trim() !== category) continue;
        rows.push({
          acquiredDate: dateReport(it.dateAcquired),
          itemName: it.name || "",
          amount: formatAmount(it.unitCost),
          property: it.propertyNumber || "",
          accountablePerson: accPerson,
          transferredTo: it.transferredTo?.trim() || "None",
          remarks: purpose,
        });
      }
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Issuance", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = REPORT_RESULTS_COLUMNS;
    rows.forEach((r) => ws.addRow(r));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="cpdc_issuance_${dateOnly(new Date())}.xlsx"`);
    await wb.xlsx.write(res);
    return res.end();
  }

  const filter = {};
  if (type) filter.type = type;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const txs = await Transaction.find(filter)
    .populate("createdBy", "name role")
    .populate("items.itemId", "name unit category itemType propertyNumber")
    .sort({ createdAt: -1 })
    .limit(5000);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Transactions");

  ws.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Type", key: "type", width: 14 },
    { header: "Created By", key: "by", width: 18 },
    { header: "Office", key: "office", width: 18 },
    { header: "Person", key: "person", width: 18 },
    { header: "Purpose", key: "purpose", width: 24 },
    { header: "Supplier", key: "supplier", width: 18 },
    { header: "Reference No.", key: "ref", width: 16 },
    { header: "Items", key: "items", width: 42 },
  ];

  txs.forEach((t) => {
    const itemsStr = (t.items || [])
      .map((x) => {
        const it = x.itemId;
        if (!it) return "";
        const tag = it.itemType === "ASSET" ? (it.propertyNumber ? `(${it.propertyNumber})` : "") : "";
        return `${tag ? tag + " " : ""}${it.name} x${x.qty}`;
      })
      .filter(Boolean)
      .join(" | ");

    ws.addRow({
      date: t.createdAt ? t.createdAt.toISOString() : "",
      type: t.type,
      by: t.createdBy?.name || "",
      office: t.issuedToOffice || "",
      person: t.issuedToPerson || "",
      purpose: t.purpose || "",
      supplier: t.supplier || "",
      ref: t.referenceNo || "",
      items: itemsStr,
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="cpdc_transactions_${dateOnly(new Date())}.xlsx"`);

  await wb.xlsx.write(res);
  res.end();
}

/** Issuance report: same columns as Report Results in the system (Acquired Date, Item Name, Amount, Property, Accountable Person, Transferred To, Remarks). One row per issued item. */
export async function exportIssuanceXlsx(req, res) {
  const { from, to, itemType } = req.query;
  const category = req.query.category ? String(req.query.category).trim() : "";
  const accountablePerson = req.query.accountablePerson ? String(req.query.accountablePerson).trim() : "";
  const filter = { type: { $in: ["ISSUANCE", "ASSET_ASSIGN"] } };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const txs = await Transaction.find(filter)
    .populate("items.itemId")
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();

  const rows = [];
  for (const t of txs) {
    const acc = t.accountablePerson || {};
    const accPerson =
      acc.name?.trim() || acc.office?.trim()
        ? [acc.name.trim(), acc.office.trim()].filter(Boolean).join(" - ")
        : "";
    const purpose = t.purpose?.trim() || "";
    if (accountablePerson) {
      const txAccName = (acc.name || "").trim() || (t.issuedToPerson || "").trim();
      const txMatches = txAccName === accountablePerson;
      if (!txMatches) {
        const itemMatches = (t.items || []).some(
          (line) => (line.itemId?.accountablePerson?.name || "").trim() === accountablePerson
        );
        if (!itemMatches) continue;
      }
    }
    for (const line of t.items || []) {
      const it = line?.itemId;
      if (!it) continue;
      if (itemType === "ASSET" || itemType === "SUPPLY") {
        if ((it.itemType || "") !== itemType) continue;
      }
      if (category && (it.category || "").trim() !== category) continue;
      rows.push({
        acquiredDate: dateReport(it.dateAcquired),
        itemName: it.name || "",
        amount: formatAmount(it.unitCost),
        property: it.propertyNumber || "",
        accountablePerson: accPerson,
        transferredTo: it.transferredTo?.trim() || "None",
        remarks: purpose,
      });
    }
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Issuance", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = REPORT_RESULTS_COLUMNS;
  rows.forEach((r) => ws.addRow(r));

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="cpdc_issuance_${dateOnly(new Date())}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

export async function exportAuditXlsx(req, res) {
  const { from, to, action } = req.query;

  const filter = {};
  if (action) filter.action = action;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const logs = await AuditLog.find(filter)
    .populate("actorId", "name role email")
    .sort({ createdAt: -1 })
    .limit(5000);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Audit");

  ws.columns = [
    { header: "Date", key: "date", width: 22 },
    { header: "Actor", key: "actor", width: 20 },
    { header: "Role", key: "role", width: 10 },
    { header: "Action", key: "action", width: 22 },
    { header: "Target Type", key: "tt", width: 12 },
    { header: "Target ID", key: "tid", width: 26 },
    { header: "Meta (JSON)", key: "meta", width: 60 },
  ];

  logs.forEach((a) => {
    ws.addRow({
      date: a.createdAt ? a.createdAt.toISOString() : "",
      actor: a.actorId?.name || "",
      role: a.actorId?.role || "",
      action: a.action,
      tt: a.targetType || "",
      tid: a.targetId || "",
      meta: JSON.stringify(a.meta || {}),
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="cpdc_audit_${dateOnly(new Date())}.xlsx"`);

  await wb.xlsx.write(res);
  res.end();
}

export async function exportDashboardSummaryXlsx(req, res) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch KPI data
  const [
    totalItems,
    activeItems,
    totalSupplies,
    totalAssets,
    archivedItems,
    outOfStockCount,
    deployedAssets,
    txToday,
    txThisMonth,
  ] = await Promise.all([
    Item.countDocuments({}),
    Item.countDocuments({ isArchived: false }),
    Item.countDocuments({ itemType: "SUPPLY", isArchived: false }),
    Item.countDocuments({ itemType: "ASSET", isArchived: false }),
    Item.countDocuments({ isArchived: true }),
    Item.countDocuments({ itemType: "SUPPLY", isArchived: false, quantityOnHand: 0 }),
    Item.countDocuments({ itemType: "ASSET", isArchived: false, status: "DEPLOYED" }),
    Transaction.countDocuments({ createdAt: { $gte: startOfToday } }),
    Transaction.countDocuments({ createdAt: { $gte: startOfMonth } }),
  ]);

  const lowStockCount = await Item.countDocuments({
    itemType: "SUPPLY",
    isArchived: false,
    reorderLevel: { $gt: 0 },
    $expr: { $lte: ["$quantityOnHand", "$reorderLevel"] },
  });

  // Fetch chart data
  const [suppliesByCategory, assetsByStatus, assetsByCondition] = await Promise.all([
    Item.aggregate([
      { $match: { itemType: "SUPPLY", isArchived: false } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $project: { _id: 0, category: "$_id", count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    Item.aggregate([
      { $match: { itemType: "ASSET", isArchived: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]),
    Item.aggregate([
      { $match: { itemType: "ASSET", isArchived: false } },
      { $group: { _id: "$condition", count: { $sum: 1 } } },
      { $project: { _id: 0, condition: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const wb = new ExcelJS.Workbook();

  // Sheet 1: KPIs
  const kpiSheet = wb.addWorksheet("KPIs", { views: [{ state: "frozen", ySplit: 1 }] });
  kpiSheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 15 },
  ];

  kpiSheet.addRow({ metric: "Total Items", value: totalItems });
  kpiSheet.addRow({ metric: "Active Items", value: activeItems });
  kpiSheet.addRow({ metric: "Archived Items", value: archivedItems });
  kpiSheet.addRow({ metric: "Total Supplies", value: totalSupplies });
  kpiSheet.addRow({ metric: "Total Assets", value: totalAssets });
  kpiSheet.addRow({ metric: "Deployed Assets", value: deployedAssets });
  kpiSheet.addRow({ metric: "Out of Stock Items", value: outOfStockCount });
  kpiSheet.addRow({ metric: "Low Stock Items", value: lowStockCount });
  kpiSheet.addRow({ metric: "Transactions Today", value: txToday });
  kpiSheet.addRow({ metric: "Transactions This Month", value: txThisMonth });

  // Sheet 2: Supplies by Category
  if (suppliesByCategory.length > 0) {
    const suppliesSheet = wb.addWorksheet("Supplies by Category", { views: [{ state: "frozen", ySplit: 1 }] });
    suppliesSheet.columns = [
      { header: "Category", key: "category", width: 30 },
      { header: "Count", key: "count", width: 15 },
    ];
    suppliesByCategory.forEach((item) => {
      suppliesSheet.addRow({ category: item.category || "Uncategorized", count: item.count });
    });
  }

  // Sheet 3: Assets by Status
  if (assetsByStatus.length > 0) {
    const assetsStatusSheet = wb.addWorksheet("Assets by Status", { views: [{ state: "frozen", ySplit: 1 }] });
    assetsStatusSheet.columns = [
      { header: "Status", key: "status", width: 30 },
      { header: "Count", key: "count", width: 15 },
    ];
    assetsByStatus.forEach((item) => {
      assetsStatusSheet.addRow({ status: item.status || "—", count: item.count });
    });
  }

  // Sheet 4: Assets by Condition
  if (assetsByCondition.length > 0) {
    const assetsConditionSheet = wb.addWorksheet("Assets by Condition", { views: [{ state: "frozen", ySplit: 1 }] });
    assetsConditionSheet.columns = [
      { header: "Condition", key: "condition", width: 30 },
      { header: "Count", key: "count", width: 15 },
    ];
    assetsByCondition.forEach((item) => {
      assetsConditionSheet.addRow({ condition: item.condition || "—", count: item.count });
    });
  }

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="cpdc_dashboard_summary_${dateOnly(new Date())}.xlsx"`);

  await wb.xlsx.write(res);
  res.end();
}
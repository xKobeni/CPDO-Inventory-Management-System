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

export async function exportItemsXlsx(req, res) {
  const items = await Item.find({ isArchived: false }).sort({ updatedAt: -1 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Items");

  ws.columns = [
    { header: "Item Type", key: "itemType", width: 10 },
    { header: "SKU", key: "sku", width: 14 },
    { header: "Name", key: "name", width: 28 },
    { header: "Category", key: "category", width: 18 },
    { header: "Unit", key: "unit", width: 10 },

    { header: "Qty On Hand", key: "quantityOnHand", width: 12 },
    { header: "Reorder Level", key: "reorderLevel", width: 12 },

    { header: "Property No.", key: "propertyNumber", width: 18 },
    { header: "Serial No.", key: "serialNumber", width: 18 },
    { header: "Brand", key: "brand", width: 14 },
    { header: "Model", key: "model", width: 14 },

    { header: "Date Acquired", key: "dateAcquired", width: 14 },
    { header: "Unit Cost", key: "unitCost", width: 12 },

    { header: "Location", key: "location", width: 22 },
    { header: "Accountable Name", key: "accName", width: 18 },
    { header: "Accountable Position", key: "accPos", width: 18 },
    { header: "Accountable Office", key: "accOffice", width: 14 },

    { header: "Status", key: "status", width: 12 },
    { header: "Condition", key: "condition", width: 12 },
    { header: "Remarks", key: "remarks", width: 28 },

    { header: "Created At", key: "createdAt", width: 18 },
    { header: "Updated At", key: "updatedAt", width: 18 },
  ];

  items.forEach((it) => {
    ws.addRow({
      itemType: it.itemType,
      sku: it.sku,
      name: it.name,
      category: it.category,
      unit: it.unit,

      quantityOnHand: it.itemType === "SUPPLY" ? it.quantityOnHand : 1,
      reorderLevel: it.itemType === "SUPPLY" ? it.reorderLevel : 0,

      propertyNumber: it.propertyNumber || "",
      serialNumber: it.serialNumber || "",
      brand: it.brand || "",
      model: it.model || "",

      dateAcquired: dateOnly(it.dateAcquired),
      unitCost: it.unitCost ?? 0,

      location: it.location || "",
      accName: it.accountablePerson?.name || "",
      accPos: it.accountablePerson?.position || "",
      accOffice: it.accountablePerson?.office || "",

      status: it.status || "",
      condition: it.condition || "",
      remarks: it.remarks || "",

      createdAt: it.createdAt?.toISOString?.() || "",
      updatedAt: it.updatedAt?.toISOString?.() || "",
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="cpdc_items_${dateOnly(new Date())}.xlsx"`);

  await wb.xlsx.write(res);
  res.end();
}

export async function exportItemsCsv(req, res) {
  const items = await Item.find({ isArchived: false }).sort({ updatedAt: -1 });

  const rows = items.map((it) => ({
    itemType: it.itemType,
    sku: it.sku,
    name: it.name,
    category: it.category,
    unit: it.unit,
    quantityOnHand: it.itemType === "SUPPLY" ? it.quantityOnHand : 1,
    reorderLevel: it.itemType === "SUPPLY" ? it.reorderLevel : 0,
    propertyNumber: it.propertyNumber || "",
    serialNumber: it.serialNumber || "",
    brand: it.brand || "",
    model: it.model || "",
    dateAcquired: dateOnly(it.dateAcquired),
    unitCost: it.unitCost ?? 0,
    location: it.location || "",
    accountableName: it.accountablePerson?.name || "",
    accountablePosition: it.accountablePerson?.position || "",
    accountableOffice: it.accountablePerson?.office || "",
    status: it.status || "",
    condition: it.condition || "",
    remarks: it.remarks || "",
    createdAt: it.createdAt?.toISOString?.() || "",
    updatedAt: it.updatedAt?.toISOString?.() || "",
  }));

  const fields = Object.keys(rows[0] || { sku: "" });
  const parser = new Json2CsvParser({ fields });
  const csv = parser.parse(rows);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="cpdc_items_${dateOnly(new Date())}.csv"`);
  res.send(csv);
}

export async function exportTransactionsXlsx(req, res) {
  const { from, to, type } = req.query;

  const filter = {};
  if (type) filter.type = type;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const txs = await Transaction.find(filter)
    .populate("createdBy", "name role")
    .populate("items.itemId", "sku name unit category itemType propertyNumber")
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
        return `${it.sku} ${tag} - ${it.name} x${x.qty}`;
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
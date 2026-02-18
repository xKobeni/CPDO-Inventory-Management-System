import fs from "fs";
import path from "path";
import cron from "node-cron";
import ExcelJS from "exceljs";
import Item from "../models/Item.js";
import Transaction from "../models/Transaction.js";
import AuditLog from "../models/AuditLog.js";

function dateStamp(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

async function writeBackupXlsx(filepath) {
  const [items, txs, audits] = await Promise.all([
    Item.find({}).sort({ updatedAt: -1 }),
    Transaction.find({}).sort({ createdAt: -1 }).limit(10000),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(10000),
  ]);

  const wb = new ExcelJS.Workbook();

  const ws1 = wb.addWorksheet("Items");
  ws1.columns = [
    { header: "itemType", key: "itemType", width: 10 },
    { header: "sku", key: "sku", width: 14 },
    { header: "name", key: "name", width: 28 },
    { header: "category", key: "category", width: 18 },
    { header: "unit", key: "unit", width: 10 },
    { header: "quantityOnHand", key: "quantityOnHand", width: 14 },
    { header: "reorderLevel", key: "reorderLevel", width: 12 },
    { header: "propertyNumber", key: "propertyNumber", width: 18 },
    { header: "serialNumber", key: "serialNumber", width: 18 },
    { header: "location", key: "location", width: 22 },
    { header: "status", key: "status", width: 12 },
    { header: "condition", key: "condition", width: 12 },
    { header: "dateAcquired", key: "dateAcquired", width: 14 },
    { header: "unitCost", key: "unitCost", width: 12 },
    { header: "remarks", key: "remarks", width: 30 },
    { header: "createdAt", key: "createdAt", width: 22 },
    { header: "updatedAt", key: "updatedAt", width: 22 },
  ];
  items.forEach((it) => ws1.addRow({
    itemType: it.itemType,
    sku: it.sku,
    name: it.name,
    category: it.category,
    unit: it.unit,
    quantityOnHand: it.quantityOnHand,
    reorderLevel: it.reorderLevel,
    propertyNumber: it.propertyNumber || "",
    serialNumber: it.serialNumber || "",
    location: it.location || "",
    status: it.status || "",
    condition: it.condition || "",
    dateAcquired: it.dateAcquired ? it.dateAcquired.toISOString().slice(0,10) : "",
    unitCost: it.unitCost ?? 0,
    remarks: it.remarks || "",
    createdAt: it.createdAt?.toISOString?.() || "",
    updatedAt: it.updatedAt?.toISOString?.() || "",
  }));

  const ws2 = wb.addWorksheet("Transactions");
  ws2.columns = [
    { header: "type", key: "type", width: 16 },
    { header: "createdAt", key: "createdAt", width: 22 },
    { header: "createdBy", key: "createdBy", width: 24 },
    { header: "issuedToOffice", key: "issuedToOffice", width: 18 },
    { header: "issuedToPerson", key: "issuedToPerson", width: 18 },
    { header: "purpose", key: "purpose", width: 26 },
    { header: "supplier", key: "supplier", width: 18 },
    { header: "referenceNo", key: "referenceNo", width: 16 },
    { header: "itemsJson", key: "itemsJson", width: 60 },
  ];
  txs.forEach((t) => ws2.addRow({
    type: t.type,
    createdAt: t.createdAt?.toISOString?.() || "",
    createdBy: t.createdBy?.toString?.() || "",
    issuedToOffice: t.issuedToOffice || "",
    issuedToPerson: t.issuedToPerson || "",
    purpose: t.purpose || "",
    supplier: t.supplier || "",
    referenceNo: t.referenceNo || "",
    itemsJson: JSON.stringify(t.items || []),
  }));

  const ws3 = wb.addWorksheet("Audit");
  ws3.columns = [
    { header: "createdAt", key: "createdAt", width: 22 },
    { header: "actorId", key: "actorId", width: 24 },
    { header: "action", key: "action", width: 24 },
    { header: "targetType", key: "targetType", width: 14 },
    { header: "targetId", key: "targetId", width: 28 },
    { header: "metaJson", key: "metaJson", width: 70 },
  ];
  audits.forEach((a) => ws3.addRow({
    createdAt: a.createdAt?.toISOString?.() || "",
    actorId: a.actorId?.toString?.() || "",
    action: a.action,
    targetType: a.targetType || "",
    targetId: a.targetId || "",
    metaJson: JSON.stringify(a.meta || {}),
  }));

  await wb.xlsx.writeFile(filepath);
}

function cleanupOldBackups(dir, keepDays) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.startsWith("cpdc_backup_") && f.endsWith(".xlsx"));
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;

  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.mtimeMs < cutoff) fs.unlinkSync(full);
  }
}

export function startBackupScheduler() {
  const enabled = String(process.env.BACKUP_ENABLED || "false").toLowerCase() === "true";
  if (!enabled) return;

  const schedule = process.env.BACKUP_SCHEDULE || "0 18 * * *";
  const keepDays = Number(process.env.BACKUP_KEEP_DAYS || 30);
  const backupDir = path.resolve(process.cwd(), "backups");

  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    cron.schedule(
    schedule,
    async () => {
        try {
        const file = path.join(backupDir, `cpdc_backup_${dateStamp()}.xlsx`);
        await writeBackupXlsx(file);
        cleanupOldBackups(backupDir, keepDays);
        console.log("✅ Backup created:", file);
        } catch (e) {
        console.error("❌ Backup failed:", e.message);
        }
    },
    { timezone: "Asia/Manila" }
    );

    console.log("🕒 Backup scheduler enabled:", schedule, "TZ=Asia/Manila");
}
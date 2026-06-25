import fs from "fs";
import path from "path";
import cron from "node-cron";
import ExcelJS from "exceljs";
import Item from "../models/Item.js";
import Transaction from "../models/Transaction.js";
import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";

function dateStamp(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

async function writeBackupXlsx(filepath) {
  const [items, txs, audits, users] = await Promise.all([
    Item.find({}).sort({ updatedAt: -1 }).lean(),
    Transaction.find({}).populate("createdBy", "name email").populate("items.itemId", "name unit category").sort({ createdAt: -1 }).limit(10000).lean(),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(10000).lean(),
    User.find({}).select("-passwordHash -refreshTokenHash -emailVerificationToken -emailVerificationTokenExpires -passwordResetOtpHash -passwordResetOtpExpires").sort({ createdAt: -1 }).lean(),
  ]);

  const wb = new ExcelJS.Workbook();

  const ws1 = wb.addWorksheet("Items");
  ws1.columns = [
    { header: "Item Type", key: "itemType", width: 12 },
    { header: "Name", key: "name", width: 28 },
    { header: "Category", key: "category", width: 18 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Quantity", key: "quantityOnHand", width: 14 },
    { header: "Reorder Level", key: "reorderLevel", width: 12 },
    { header: "Expiration Date", key: "expirationDate", width: 14 },
    { header: "Property Number", key: "propertyNumber", width: 18 },
    { header: "Serial Number", key: "serialNumber", width: 18 },
    { header: "Brand", key: "brand", width: 15 },
    { header: "Model", key: "model", width: 15 },
    { header: "Division", key: "division", width: 22 },
    { header: "Status", key: "status", width: 12 },
    { header: "Condition", key: "condition", width: 12 },
    { header: "Date Acquired", key: "dateAcquired", width: 14 },
    { header: "Unit Cost", key: "unitCost", width: 12 },
    { header: "Accountable Person", key: "accountablePersonName", width: 25 },
    { header: "Accountable Position", key: "accountablePersonPosition", width: 20 },
    { header: "Accountable Office", key: "accountablePersonOffice", width: 25 },
    { header: "Transferred To", key: "transferredTo", width: 25 },
    { header: "Assigned Date", key: "assignedDate", width: 14 },
    { header: "Returned Date", key: "returnedDate", width: 14 },
    { header: "Remarks", key: "remarks", width: 30 },
    { header: "Is Archived", key: "isArchived", width: 12 },
    { header: "Created At", key: "createdAt", width: 22 },
    { header: "Updated At", key: "updatedAt", width: 22 },
  ];
  items.forEach((it) => ws1.addRow({
    itemType: it.itemType || "",
    name: it.name || "",
    category: it.category || "",
    unit: it.unit || "",
    quantityOnHand: it.quantityOnHand ?? 0,
    reorderLevel: it.reorderLevel ?? 0,
    expirationDate: it.expirationDate ? it.expirationDate.toISOString().slice(0, 10) : "",
    propertyNumber: it.propertyNumber || "",
    serialNumber: it.serialNumber || "",
    brand: it.brand || "",
    model: it.model || "",
    division: it.division || "",
    status: it.status || "",
    condition: it.condition || "",
    dateAcquired: it.dateAcquired ? it.dateAcquired.toISOString().slice(0, 10) : "",
    unitCost: it.unitCost ?? 0,
    accountablePersonName: it.accountablePerson?.name || "",
    accountablePersonPosition: it.accountablePerson?.position || "",
    accountablePersonOffice: it.accountablePerson?.office || "",
    transferredTo: it.transferredTo || "",
    assignedDate: it.assignedDate ? it.assignedDate.toISOString().slice(0, 10) : "",
    returnedDate: it.returnedDate ? it.returnedDate.toISOString().slice(0, 10) : "",
    remarks: it.remarks || "",
    isArchived: it.isArchived ? "Yes" : "No",
    createdAt: it.createdAt?.toISOString?.() || "",
    updatedAt: it.updatedAt?.toISOString?.() || "",
  }));

  const ws2 = wb.addWorksheet("Transactions");
  ws2.columns = [
    { header: "Type", key: "type", width: 16 },
    { header: "Created At", key: "createdAt", width: 22 },
    { header: "Created By", key: "createdByName", width: 24 },
    { header: "Created By Email", key: "createdByEmail", width: 30 },
    { header: "Issued To Office", key: "issuedToOffice", width: 18 },
    { header: "Issued To Person", key: "issuedToPerson", width: 18 },
    { header: "Accountable Person", key: "accountablePersonName", width: 25 },
    { header: "Accountable Position", key: "accountablePersonPosition", width: 20 },
    { header: "Accountable Office", key: "accountablePersonOffice", width: 25 },
    { header: "Purpose", key: "purpose", width: 26 },
    { header: "Supplier", key: "supplier", width: 18 },
    { header: "Reference No", key: "referenceNo", width: 16 },
    { header: "Items", key: "itemsSummary", width: 60 },
  ];
  txs.forEach((t) => {
    const createdByUser = t.createdBy || {};
    const itemsSummary = (t.items || [])
      .map((it) => {
        const itemName = it.itemId?.name || it.itemId?.toString() || "(deleted)";
        const unit = it.itemId?.unit || "";
        return `${itemName}${unit ? ` (${unit})` : ""} × ${it.qty}`;
      })
      .join("; ");
    ws2.addRow({
      type: t.type || "",
      createdAt: t.createdAt?.toISOString?.() || "",
      createdByName: createdByUser.name || createdByUser._id?.toString() || "",
      createdByEmail: createdByUser.email || "",
      issuedToOffice: t.issuedToOffice || "",
      issuedToPerson: t.issuedToPerson || "",
      accountablePersonName: t.accountablePerson?.name || "",
      accountablePersonPosition: t.accountablePerson?.position || "",
      accountablePersonOffice: t.accountablePerson?.office || "",
      purpose: t.purpose || "",
      supplier: t.supplier || "",
      referenceNo: t.referenceNo || "",
      itemsSummary,
    });
  });

  const ws3 = wb.addWorksheet("Audit");
  ws3.columns = [
    { header: "Created At", key: "createdAt", width: 22 },
    { header: "Actor ID", key: "actorId", width: 24 },
    { header: "Action", key: "action", width: 24 },
    { header: "Target Type", key: "targetType", width: 14 },
    { header: "Target ID", key: "targetId", width: 28 },
    { header: "Meta (JSON)", key: "metaJson", width: 70 },
  ];
  audits.forEach((a) => ws3.addRow({
    createdAt: a.createdAt?.toISOString?.() || "",
    actorId: a.actorId?.toString?.() || "",
    action: a.action,
    targetType: a.targetType || "",
    targetId: a.targetId || "",
    metaJson: JSON.stringify(a.meta || {}),
  }));

  const ws4 = wb.addWorksheet("Users");
  ws4.columns = [
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Role", key: "role", width: 12 },
    { header: "Is Active", key: "isActive", width: 12 },
    { header: "Is Verified", key: "isVerified", width: 12 },
    { header: "Login Attempts", key: "loginAttempts", width: 14 },
    { header: "Last Login", key: "lastLoginAt", width: 20 },
    { header: "Locked Until", key: "lockUntil", width: 20 },
    { header: "Created At", key: "createdAt", width: 22 },
    { header: "Updated At", key: "updatedAt", width: 22 },
  ];
  users.forEach((u) => ws4.addRow({
    name: u.name || "",
    email: u.email || "",
    role: u.role || "",
    isActive: u.isActive ? "Yes" : "No",
    isVerified: u.isVerified ? "Yes" : "No",
    loginAttempts: u.loginAttempts ?? 0,
    lastLoginAt: u.lastLoginAt?.toISOString?.() || "",
    lockUntil: u.lockUntil?.toISOString?.() || "",
    createdAt: u.createdAt?.toISOString?.() || "",
    updatedAt: u.updatedAt?.toISOString?.() || "",
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
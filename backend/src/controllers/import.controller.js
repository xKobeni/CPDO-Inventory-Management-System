import XLSX from "xlsx";
import { z } from "zod";
import Item from "../models/Item.js";
import AuditLog from "../models/AuditLog.js";

const rowSchema = z.object({
  itemType: z.enum(["SUPPLY", "ASSET"]).optional().default("SUPPLY"),
  name: z.string().min(2).max(200),
  category: z.string().max(120).optional().default("General"),
  unit: z.string().max(30).optional().default("pc"),

  quantityOnHand: z.coerce.number().int().min(0).optional().default(0),
  reorderLevel: z.coerce.number().int().min(0).optional().default(0),

  propertyNumber: z.string().max(80).optional().nullable().default(null),
  serialNumber: z.string().max(120).optional().nullable().default(null),
  brand: z.string().max(120).optional().default(""),
  model: z.string().max(120).optional().default(""),

  division: z.string().max(200).optional().default(""),

  dateAcquired: z.string().optional().nullable().default(null),
  unitCost: z.coerce.number().min(0).optional().default(0),

  accountableName: z.string().max(200).optional().default(""),
  accountablePosition: z.string().max(200).optional().default(""),
  accountableOffice: z.string().max(200).optional().default("CPDC"),

  status: z.enum(["IN_STOCK", "DEPLOYED", "FOR_REPAIR", "DISPOSED", "LOST"]).optional().default("IN_STOCK"),
  condition: z.enum(["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"]).optional().default("GOOD"),

  remarks: z.string().max(1000).optional().default(""),
});

function parseDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function importItems(req, res) {
  const mode = (req.query.mode || "upsert").toString(); // upsert | createOnly | updateOnly
  if (!req.file) return res.status(400).json({ message: "Missing file (multipart form-data key: file)" });

  // Read spreadsheet/CSV from buffer
  const wb = XLSX.read(req.file.buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" }); // uses headers row

  const report = {
    mode,
    totalRows: rawRows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < rawRows.length; i++) {
    try {
      const r = rawRows[i];

      // Support both our export headers and “nice” headers:
      // If user uses "Accountable Name", map it too.
      const normalized = {
        itemType: r.itemType || r["Item Type"] || r["item type"] || "SUPPLY",
        name: r.name || r["Name"],
        category: r.category || r["Category"],
        unit: r.unit || r["Unit"],

        quantityOnHand: r.quantityOnHand ?? r["Qty On Hand"] ?? r["quantity"],
        reorderLevel: r.reorderLevel ?? r["Reorder Level"],

        propertyNumber: r.propertyNumber ?? r["Property No."] ?? r["Property Number"],
        serialNumber: r.serialNumber ?? r["Serial No."] ?? r["Serial Number"],
        brand: r.brand ?? r["Brand"],
        model: r.model ?? r["Model"],

        division: r.division ?? r["Division"] ?? r.location ?? r["Location"] ?? "",

        dateAcquired: r.dateAcquired ?? r["Date Acquired"],
        unitCost: r.unitCost ?? r["Unit Cost"] ?? r["Amount"],

        accountableName: r.accountableName ?? r["Accountable Name"],
        accountablePosition: r.accountablePosition ?? r["Accountable Position"],
        accountableOffice: r.accountableOffice ?? r["Accountable Office"],

        status: r.status ?? r["Status"],
        condition: r.condition ?? r["Condition"],
        remarks: r.remarks ?? r["Remarks"],
      };

      const parsed = rowSchema.parse(normalized);

      const patch = {
        itemType: parsed.itemType,
        name: parsed.name,
        category: parsed.category,
        unit: parsed.unit,
        dateAcquired: parseDateOrNull(parsed.dateAcquired),
        unitCost: parsed.unitCost,
        remarks: parsed.remarks,
        division: parsed.division,
        status: parsed.status,
        condition: parsed.condition,

        propertyNumber: parsed.propertyNumber || null,
        serialNumber: parsed.serialNumber || null,
        brand: parsed.brand,
        model: parsed.model,

        accountablePerson: {
          name: parsed.accountableName,
          position: parsed.accountablePosition,
          office: parsed.accountableOffice,
        },
      };

      // Enforce rules
      if (parsed.itemType === "SUPPLY") {
        patch.quantityOnHand = parsed.quantityOnHand;
        patch.reorderLevel = parsed.reorderLevel;
        // clear asset-only identifiers if blank is fine; we keep if provided
      } else {
        patch.quantityOnHand = 1;
        patch.reorderLevel = 0;
      }

      // Determine matching key: ASSET by propertyNumber, SUPPLY by name+category
      const match = parsed.itemType === "ASSET" && parsed.propertyNumber
        ? { itemType: "ASSET", propertyNumber: parsed.propertyNumber }
        : { itemType: "SUPPLY", name: parsed.name.trim(), category: parsed.category?.trim() || "General" };

      const existing = await Item.findOne(match);

      if (!existing && mode === "updateOnly") {
        report.skipped++;
        continue;
      }
      if (existing && mode === "createOnly") {
        report.skipped++;
        continue;
      }

      if (!existing) {
        const created = await Item.create(patch);
        report.inserted++;

        await AuditLog.create({
          actorId: req.user._id,
          action: "IMPORT_ITEM_CREATE",
          targetType: "Item",
          targetId: created._id.toString(),
          meta: { match, rowIndex: i + 2 },
        });
      } else {
        Object.assign(existing, patch);
        if (existing.itemType === "ASSET") {
          existing.quantityOnHand = 1;
          existing.reorderLevel = 0;
        }
        await existing.save();
        report.updated++;

        await AuditLog.create({
          actorId: req.user._id,
          action: "IMPORT_ITEM_UPDATE",
          targetType: "Item",
          targetId: existing._id.toString(),
          meta: { match, rowIndex: i + 2 },
        });
      }
    } catch (e) {
      report.errors.push({
        row: i + 2, // header is row 1 in Excel
        message: e?.message || "Row error",
      });
    }
  }

  res.json(report);
}
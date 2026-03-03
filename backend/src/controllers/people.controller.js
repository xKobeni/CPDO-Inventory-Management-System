import mongoose from "mongoose";
import { z } from "zod";
import Person from "../models/Person.js";
import AuditLog from "../models/AuditLog.js";

export const createPersonSchema = z.object({
  name: z.string().min(2).max(200).transform((v) => v.trim()),
  position: z.string().max(200).optional().default("").transform((v) => (v || "").trim()),
  office: z.string().max(200).optional().default("CPDC").transform((v) => (v || "CPDC").trim() || "CPDC"),
});

export async function listPeople(req, res) {
  const { q, active, page, pageSize } = req.query;
  const filter = {};
  if (active === "true") filter.isActive = true;
  if (active === "false") filter.isActive = false;
  
  if (q && String(q).trim()) {
    filter.$text = { $search: String(q).trim() };
  }
  
  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(500, Math.max(1, parseInt(pageSize, 10) || 100));
  const skip = (p - 1) * ps;
  
  const [people, total] = await Promise.all([
    Person.find(filter)
      .select("name position office isActive createdAt")
      .sort(q && String(q).trim() ? { score: { $meta: "textScore" } } : { name: 1 })
      .skip(skip)
      .limit(ps)
      .lean(),
    Person.countDocuments(filter)
  ]);
  
  res.json({ people, total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) });
}

export async function createPerson(req, res) {
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "name is required" });

  const exists = await Person.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  if (exists) return res.status(409).json({ message: "Person already exists" });

  const person = await Person.create({
    name,
    position: req.body.position || "",
    office: req.body.office || "CPDC",
    isActive: true,
  });

  await AuditLog.create({
    actorId: req.user._id,
    action: "PERSON_CREATE",
    targetType: "Person",
    targetId: person._id.toString(),
    meta: { name: person.name, office: person.office },
  });

  res.status(201).json(person);
}

export async function deactivatePerson(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid person id" });

  const person = await Person.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!person) return res.status(404).json({ message: "Person not found" });

  await AuditLog.create({
    actorId: req.user._id,
    action: "PERSON_DEACTIVATE",
    targetType: "Person",
    targetId: id,
    meta: { name: person.name },
  });

  res.json({ ok: true, id });
}

export async function activatePerson(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid person id" });

  const person = await Person.findByIdAndUpdate(id, { isActive: true }, { new: true });
  if (!person) return res.status(404).json({ message: "Person not found" });

  await AuditLog.create({
    actorId: req.user._id,
    action: "PERSON_ACTIVATE",
    targetType: "Person",
    targetId: id,
    meta: { name: person.name },
  });

  res.json({ ok: true, id });
}

export async function deletePerson(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid person id" });

  const person = await Person.findById(id);
  if (!person) return res.status(404).json({ message: "Person not found" });

  await Person.findByIdAndDelete(id);

  await AuditLog.create({
    actorId: req.user._id,
    action: "PERSON_DELETE",
    targetType: "Person",
    targetId: id,
    meta: { name: person.name, office: person.office },
  });

  res.json({ ok: true });
}

export async function updatePerson(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid person id" });

  const person = await Person.findById(id);
  if (!person) return res.status(404).json({ message: "Person not found" });

  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "name is required" });

  // ensure unique name (case-insensitive) excluding current
  const exists = await Person.findOne({
    _id: { $ne: id },
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "i"),
  });
  if (exists) return res.status(409).json({ message: "Person already exists" });

  person.name = name;
  person.position = req.body.position || "";
  person.office = req.body.office || "CPDC";

  await person.save();

  await AuditLog.create({
    actorId: req.user._id,
    action: "PERSON_UPDATE",
    targetType: "Person",
    targetId: id,
    meta: { name: person.name, office: person.office },
  });

  res.json(person);
}


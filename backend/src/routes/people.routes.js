import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { validateBody } from "../middleware/validate.js";
import {
  listPeople,
  createPerson,
  deactivatePerson,
  activatePerson,
  deletePerson,
  updatePerson,
  createPersonSchema,
} from "../controllers/people.controller.js";

const r = Router();

// Require authenticated users for all person routes
r.use(requireAuth);

// List and create available to ADMIN and STAFF
r.get("/", requireRole("ADMIN", "STAFF"), listPeople);
r.post("/", requireRole("ADMIN", "STAFF"), validateBody(createPersonSchema), createPerson);

// Activate/deactivate available to ADMIN and STAFF
r.post("/:id/deactivate", requireRole("ADMIN", "STAFF"), deactivatePerson);
r.post("/:id/activate", requireRole("ADMIN", "STAFF"), activatePerson);

// Update (edit) person
r.put("/:id", requireRole("ADMIN", "STAFF"), validateBody(createPersonSchema), updatePerson);

// Delete is admin-only
r.delete("/:id", requireRole("ADMIN"), deletePerson);

export default r;


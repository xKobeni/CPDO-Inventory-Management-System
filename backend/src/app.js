import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";

import usersRoutes from "./routes/users.routes.js";
import healthRoutes from "./routes/health.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import authRoutes from "./routes/auth.routes.js";
import itemsRoutes from "./routes/items.routes.js";
import txRoutes from "./routes/transactions.routes.js";
import { notFound, errorHandler } from "./middleware/error.js";
import exportRoutes from "./routes/export.routes.js";
import importRoutes from "./routes/import.routes.js";
import peopleRoutes from "./routes/people.routes.js";

const app = express();

// IMPORTANT when deploying behind proxies (Render/Nginx)
app.set("trust proxy", 1);

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Mongo sanitize: remove $ and . in keys to prevent operator injection.
// Express 5 compat: req.query/params/headers are getter-only; we mutate in place and do not reassign.
const sanitize = mongoSanitize.sanitize ?? mongoSanitize;
app.use((req, _res, next) => {
  if (req.body) sanitize(req.body);
  if (req.params && Object.keys(req.params).length) sanitize(req.params);
  if (req.query && Object.keys(req.query).length) sanitize(req.query);
  if (req.headers && typeof req.headers === "object") sanitize(req.headers);
  next();
});

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (req, res) => res.json({ ok: true, name: "CPDC Inventory API" }));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/items", itemsRoutes);
app.use("/api/transactions", txRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/people", peopleRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/import", importRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
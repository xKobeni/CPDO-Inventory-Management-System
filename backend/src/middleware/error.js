export function notFound(req, res) {
  res.status(404).json({ message: "Route not found" });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const isOperational = status >= 400 && status < 500;
  const message =
    process.env.NODE_ENV === "production" && !isOperational
      ? "Server error"
      : err.message || "Server error";
  res.status(status).json({ message });
}
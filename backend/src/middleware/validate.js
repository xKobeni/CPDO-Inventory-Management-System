export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        issues: parsed.error.issues.map(i => ({ path: i.path.join("."), message: i.message })),
      });
    }
    req.body = parsed.data;
    next();
  };
}
import bcrypt from "bcrypt";

export async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function hashToken(token) {
  const saltRounds = 12;
  return bcrypt.hash(token, saltRounds);
}

export async function verifyTokenHash(token, hash) {
  return bcrypt.compare(token, hash);
}
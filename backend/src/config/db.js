import mongoose from "mongoose";
import Item from "../models/Item.js";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);

  // Drops indexes no longer in schema (e.g. serialNumber_1, propertyNumber_1) to avoid E11000 on null
  await Item.syncIndexes();

  console.log("MongoDB connected");
}
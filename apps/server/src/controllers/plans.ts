import type { Request, Response } from "express";
import { db } from "../db/client";
import { plans } from "../db/schema";

export async function listPlans(_req: Request, res: Response) {
  const all = await db.select().from(plans);
  res.json(all);
}

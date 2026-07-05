import type { Request, Response } from "express";
import { db } from "../db/client";
import { branches } from "../db/schema";

export async function listBranches(_req: Request, res: Response) {
  const all = await db.select().from(branches);
  res.json(all);
}

import type { NextFunction, Request, Response } from "express";

import { resolveAuthenticatedAdmin } from "../services/authSession.service";

export interface AuthenticatedRequest extends Request {
  authUser?: {
    id: string;
    email?: string | null;
  };
  admin?: {
    id: string;
    auth_id: string;
    gym_id?: string | null;
    gym_type?: "single" | "branch" | null;
    [key: string]: unknown;
  };
}

export async function requireAuthenticatedAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const session = await resolveAuthenticatedAdmin(req, res);
    if (!session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    req.authUser = session.user;
    req.admin = session.admin;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authenticated" });
  }
}

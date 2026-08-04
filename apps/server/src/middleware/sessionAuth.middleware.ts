import type { NextFunction, Request, Response } from "express";

import { resolveAuthenticatedSession, type SessionRole, type StaffSessionProfile } from "../services/authSession.service";
import { hasBillingFeature, type BillingFeatureKey } from "../services/billing.service";

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
    subscription?: any;
    [key: string]: unknown;
  };
  staff?: StaffSessionProfile | null;
  sessionRole?: SessionRole;
}

const SECTION_FEATURE_MAP: Partial<Record<string, BillingFeatureKey>> = {
  classes: "classes",
  pt: "pt_sessions",
};

function hasSectionAccess(req: AuthenticatedRequest, section: string) {
  const requiredFeature = SECTION_FEATURE_MAP[section];
  if (requiredFeature && !hasBillingFeature(req.admin?.subscription, requiredFeature)) {
    return false;
  }

  if (req.sessionRole === "admin") {
    return true;
  }

  return Boolean(req.staff?.section_permissions.includes(section));
}

export async function requireAuthenticatedSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const session = await resolveAuthenticatedSession(req, res);
    if (!session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    req.authUser = session.user;
    req.admin = session.admin;
    req.staff = session.staff;
    req.sessionRole = session.role;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authenticated" });
  }
}

export async function requireAuthenticatedAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const session = await resolveAuthenticatedSession(req, res);
    if (!session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (session.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.authUser = session.user;
    req.admin = session.admin;
    req.staff = session.staff;
    req.sessionRole = session.role;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authenticated" });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.sessionRole !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  return next();
}

export function requireSectionAccess(section: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!hasSectionAccess(req, section)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
}

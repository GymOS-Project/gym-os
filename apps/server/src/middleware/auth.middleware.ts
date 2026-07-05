import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../supabase";
import {
  canEmployeeEditSection,
  type AdminSectionKey,
  isAdminSectionKey,
} from "../services/employeeSectionPermissions.service";

interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET not set");
    }
    const decoded = jwt.verify(token, secret) as { id: string; email: string };

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(401).json({ message: "Not authorized as an administrator" });
  }
};

export const staff = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "employee")) {
    next();
  } else {
    res.status(401).json({ message: "Not authorized" });
  }
};

export const requireSectionEdit =
  (sectionKey: AdminSectionKey) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (req.user.role === "admin") {
      return next();
    }

    if (req.user.role !== "employee") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!isAdminSectionKey(sectionKey)) {
      return res.status(400).json({ message: "Invalid section key" });
    }

    try {
      const ok = await canEmployeeEditSection(req.user.id, sectionKey);
      if (!ok) {
        return res.status(403).json({ message: "Edit access denied" });
      }
      return next();
    } catch (error) {
      return res.status(500).json({ message: "Failed to verify permissions" });
    }
  };

export type { AuthRequest };

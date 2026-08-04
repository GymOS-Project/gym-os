import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "./sessionAuth.middleware";
import { hasBillingFeature, type BillingFeatureKey } from "../services/billing.service";

export function requirePlanFeature(feature: BillingFeatureKey) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!hasBillingFeature(req.admin?.subscription, feature)) {
      return res.status(403).json({
        message: `Your current plan does not include ${feature.replace(/_/g, " ")}. Upgrade to continue.`,
        code: "PLAN_FEATURE_LOCKED",
        feature,
        plan: req.admin?.subscription,
      });
    }

    return next();
  };
}

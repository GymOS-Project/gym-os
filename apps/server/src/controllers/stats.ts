import type { Request, Response } from "express";
import { db } from "../db/client";
import { branches, members, plans } from "../db/schema";

export async function getDashboardStats(_req: Request, res: Response) {
  const allMembers = await db.select().from(members);
  const allPlans = await db.select().from(plans);
  const allBranches = await db.select().from(branches);

  const activeMembers = allMembers.filter((member) => member.status === "active").length;
  const expiredMembers = allMembers.filter((member) => member.status === "expired").length;
  const expiringSoon = allMembers.filter(
    (member) => member.status === "expiring_soon"
  ).length;

  const branchDistribution = allBranches.map((branch) => ({
    branch: branch.id,
    count: allMembers.filter((member) => member.branch === branch.id).length,
  }));

  const planDistribution = allPlans.map((plan) => ({
    plan: plan.id,
    count: allMembers.filter((member) => member.plan === plan.id).length,
  }));

  const planPriceMap = new Map(allPlans.map((plan) => [plan.id, Number(plan.price)]));
  const nonExpiredMembers = allMembers.filter((member) => member.status !== "expired");

  const monthlyRevenue = nonExpiredMembers.reduce((sum, member) => {
    const price = planPriceMap.get(member.plan) ?? 0;
    return sum + price;
  }, 0);

  res.json({
    totalMembers: allMembers.length,
    activeMembers,
    expiredMembers,
    expiringThisWeek: expiringSoon,
    monthlyRevenue,
    branchDistribution,
    planDistribution,
  });
}

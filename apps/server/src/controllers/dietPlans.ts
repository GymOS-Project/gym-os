import { createSharedPlanController } from "./sharedPlanController";

export const {
  list: listDietPlans,
  get: getDietPlan,
  create: createDietPlan,
  update: updateDietPlan,
  remove: deleteDietPlan,
} = createSharedPlanController("diet_plans");

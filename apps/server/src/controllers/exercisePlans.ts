import { createSharedPlanController } from "./sharedPlanController";

export const {
  list: listExercisePlans,
  get: getExercisePlan,
  create: createExercisePlan,
  update: updateExercisePlan,
  remove: deleteExercisePlan,
} = createSharedPlanController("exercise_plans");

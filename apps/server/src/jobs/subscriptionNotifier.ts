import { Queue, Worker } from "bullmq";
import { supabase } from "../supabase";

const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null as null,
};

export const subscriptionQueue = new Queue("subscription-reminders", { connection });

export function startSubscriptionWorker() {
  const worker = new Worker(
    "subscription-reminders",
    async (job) => {
      if (job.name !== "check-expiring") return;
      const today = new Date().toISOString().split("T")[0];
      const threeDaysFromNow = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

      const { data: expiring, error } = await supabase
        .from("member_packages")
        .select("end_date, members(id, name, phone)")
        .eq("status", "active")
        .gte("end_date", today)
        .lte("end_date", threeDaysFromNow);

      if (error) throw error;

      console.log(`[subscriptionWorker] ${expiring?.length ?? 0} expiring packages for ${today}`);
      for (const pkg of expiring || []) {
        const member = (pkg as any).members;
        if (!member?.phone) continue;
        console.log(`[subscriptionWorker] Reminder due: ${member.name} expires ${pkg.end_date}`);
      }
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    console.error(`[subscriptionWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

export async function scheduleSubscriptionReminder() {
  await subscriptionQueue.add(
    "check-expiring",
    {},
    {
      repeat: { pattern: "0 9 * * *" },
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );
  console.log("[subscriptionQueue] Daily reminder job scheduled (09:00)");
}

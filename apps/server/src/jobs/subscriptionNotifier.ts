import { Queue, Worker } from "bullmq";
import { supabase } from "../supabase";
import { sendMembershipReminderEmail } from "../services/email.service";
import { DEFAULT_NOTIFICATION_MAX_ATTEMPTS, calculateNextNotificationRetryAt, resolveNotificationFailureStatus } from "../services/notificationDelivery.service";

import dotenv from "dotenv";

dotenv.config();

const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null as null,
};

export const subscriptionQueue = new Queue("subscription-reminders", { connection });

async function sendMembershipExpiryDelivery(deliveryId: string, pkg: any, member: any, gym: any, attemptCount: number, maxAttempts = DEFAULT_NOTIFICATION_MAX_ATTEMPTS) {
  const attemptedAt = new Date().toISOString();

  try {
    const sent = await sendMembershipReminderEmail({
      to: member.email,
      memberName: member.name,
      gymName: gym?.gym_name || "your gym",
      packageName: pkg.package_name || "membership",
      endDate: pkg.end_date,
    });

    await supabase.from("notification_deliveries").update({
      status: sent ? "sent" : "skipped",
      attempt_count: attemptCount,
      last_attempt_at: attemptedAt,
      sent_at: sent ? attemptedAt : null,
      error_message: sent ? null : "Email provider is not configured",
      next_retry_at: null,
    }).eq("id", deliveryId);
  } catch (sendError) {
    const status = resolveNotificationFailureStatus(attemptCount, maxAttempts);
    await supabase.from("notification_deliveries").update({
      status,
      attempt_count: attemptCount,
      last_attempt_at: attemptedAt,
      error_message: sendError instanceof Error ? sendError.message : "Failed to send reminder",
      next_retry_at: status === "failed" ? calculateNextNotificationRetryAt(attemptCount) : null,
    }).eq("id", deliveryId);
  }
}

async function processDueReminderRetries() {
  const now = new Date().toISOString();
  const { data: dueDeliveries, error } = await supabase
    .from("notification_deliveries")
    .select("id, attempt_count, max_attempts, member_package_id")
    .eq("status", "failed")
    .lte("next_retry_at", now)
    .lt("attempt_count", DEFAULT_NOTIFICATION_MAX_ATTEMPTS)
    .limit(50);

  if (error) throw error;

  for (const delivery of dueDeliveries || []) {
    const { data: pkg, error: packageError } = await supabase
      .from("member_packages")
      .select("id, package_name, end_date, members(id, name, email), gyms(id, gym_name)")
      .eq("id", (delivery as any).member_package_id)
      .maybeSingle();

    if (packageError) throw packageError;
    const member = (pkg as any)?.members;
    if (!pkg || !member?.email) {
      await supabase.from("notification_deliveries").update({ status: "skipped", error_message: "Retry target no longer exists or has no email", next_retry_at: null }).eq("id", (delivery as any).id);
      continue;
    }

    await sendMembershipExpiryDelivery(
      (delivery as any).id,
      pkg,
      member,
      (pkg as any).gyms,
      Number((delivery as any).attempt_count || 0) + 1,
      Number((delivery as any).max_attempts || DEFAULT_NOTIFICATION_MAX_ATTEMPTS),
    );
  }
}

export function startSubscriptionWorker() {
  const worker = new Worker(
    "subscription-reminders",
    async (job) => {
      if (job.name !== "check-expiring") return;
      await processDueReminderRetries();
      const today = new Date().toISOString().split("T")[0];
      const threeDaysFromNow = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

      const { data: expiring, error } = await supabase
        .from("member_packages")
        .select("id, admin_id, gym_id, member_id, package_name, end_date, members(id, name, phone, email), gyms(id, gym_name)")
        .eq("status", "active")
        .gte("end_date", today)
        .lte("end_date", threeDaysFromNow);

      if (error) throw error;

      console.log(`[subscriptionWorker] ${expiring?.length ?? 0} expiring packages for ${today}`);
      for (const pkg of expiring || []) {
        const member = (pkg as any).members;
        const gym = (pkg as any).gyms;
        if (!member?.email) continue;

        const alreadySent = await supabase
          .from("notification_deliveries")
          .select("id")
          .eq("member_package_id", (pkg as any).id)
          .eq("channel", "email")
          .eq("notification_type", "membership_expiring")
          .gte("created_at", `${today}T00:00:00.000Z`)
          .limit(1)
          .maybeSingle();

        if (alreadySent.data) continue;

        const delivery = await supabase.from("notification_deliveries").insert({
          admin_id: (pkg as any).admin_id,
          gym_id: (pkg as any).gym_id,
          member_id: (pkg as any).member_id,
          member_package_id: (pkg as any).id,
          channel: "email",
          notification_type: "membership_expiring",
          recipient: member.email,
          subject: `Membership renewal reminder - ${gym?.gym_name || "your gym"}`,
          status: "pending",
          attempt_count: 1,
          max_attempts: DEFAULT_NOTIFICATION_MAX_ATTEMPTS,
          last_attempt_at: new Date().toISOString(),
        }).select("id").single();

        if (delivery.error) {
          console.error("[subscriptionWorker] Failed to log pending delivery", delivery.error.message);
          continue;
        }

        await sendMembershipExpiryDelivery(delivery.data.id, pkg, member, gym, 1);
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

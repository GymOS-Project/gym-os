import cron from "node-cron";
import { supabase } from "../supabase";
import { sendWhatsAppMessage } from "../services/whatsapp";

export function startSubscriptionExpiryReminderJob() {
  cron.schedule("0 9 * * *", async () => {
    const today = new Date().toISOString().split("T")[0];
    const threeDaysFromNow = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

    try {
      const { data: expiring, error } = await supabase
        .from("member_packages")
        .select("end_date, members(id, name, phone)")
        .eq("status", "active")
        .gte("end_date", today)
        .lte("end_date", threeDaysFromNow);

      if (error) throw error;

      for (const pkg of expiring || []) {
        const member = (pkg as any).members;
        if (!member?.phone) continue;
        await sendWhatsAppMessage(
          member.phone,
          `Hi ${member.name}, your gym membership expires on ${pkg.end_date}. Please renew to continue your training!`
        );
      }
    } catch (err) {
      console.error("[subscriptionReminder] Failed to send expiry notifications", err);
    }
  });
}

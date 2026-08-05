import { Resend } from "resend";

const resendApiKey = normalizeOptionalString(process.env.RESEND_API_KEY);
const resendFromEmail = normalizeOptionalString(process.env.RESEND_FROM_EMAIL);
const adminAppUrl = normalizeUrl(process.env.FRONTEND_URL) || "https://app.gymos.example/admin";
const mobileAppUrl = normalizeUrl(process.env.MOBILE_APP_URL) || "https://app.gymos.example/mobile";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

type GymOnboardingWelcomeEmailInput = {
  to: string;
  ownerName: string;
  gymName: string;
  gymType: "single" | "branch";
  gymCount: number;
};

type StaffAccountCreatedEmailInput = {
  to: string;
  fullName: string;
  gymName: string;
  role: string;
};

type MemberWelcomeEmailInput = {
  to: string;
  fullName: string;
  gymName: string;
};

type InvoiceReceiptEmailInput = {
  to: string;
  subject: string;
  html: string;
};

type MembershipReminderEmailInput = {
  to: string;
  memberName: string;
  gymName: string;
  packageName: string;
  endDate: string;
};

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value == null ? null : String(value);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeUrl(value: unknown) {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.replace(/\/$/, "") : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmailTemplate({
  eyebrow,
  title,
  intro,
  ctaLabel,
  ctaUrl,
  secondaryText,
  secondaryUrl,
  note,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryText?: string;
  secondaryUrl?: string;
  note: string;
}) {
  const safeEyebrow = escapeHtml(eyebrow);
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const safeCtaUrl = escapeHtml(ctaUrl);
  const safeNote = escapeHtml(note);
  const safeSecondaryText = secondaryText ? escapeHtml(secondaryText) : null;
  const safeSecondaryUrl = secondaryUrl ? escapeHtml(secondaryUrl) : null;

  return `<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0;">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0b0f14;font-family:Arial,Helvetica,sans-serif;color:#e8edf2;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0b0f14;margin:0;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;">
            <tr>
              <td style="padding:0 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(145deg,#141a22 0%,#0d1117 62%,#243515 100%);border:1px solid #2a3340;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px -16px rgba(0,0,0,0.55);">
                  <tr>
                    <td style="padding:32px 32px 20px 32px;">
                      <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(184,255,51,0.12);border:1px solid rgba(184,255,51,0.28);color:#b8ff33;font-size:12px;font-weight:700;letter-spacing:0.08em;">
                        ${safeEyebrow}
                      </div>
                      <h1 style="margin:18px 0 10px 0;font-size:30px;line-height:1.2;color:#ffffff;font-weight:700;">
                        ${safeTitle}
                      </h1>
                      <p style="margin:0;font-size:16px;line-height:1.7;color:#c7d0da;">
                        ${safeIntro}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 32px 8px 32px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="border-radius:14px;background:linear-gradient(135deg,#c7ff2f 0%,#6ddc2d 100%);">
                            <a href="${safeCtaUrl}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:700;color:#11161d;text-decoration:none;border-radius:14px;">
                              ${safeCtaLabel}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ${safeSecondaryText && safeSecondaryUrl ? `
                  <tr>
                    <td style="padding:16px 32px 8px 32px;">
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#9eacba;">
                        ${safeSecondaryText}
                      </p>
                      <p style="margin:10px 0 0 0;word-break:break-all;">
                        <a href="${safeSecondaryUrl}" style="color:#b8ff33;text-decoration:underline;font-size:14px;">${safeSecondaryUrl}</a>
                      </p>
                    </td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding:20px 32px 32px 32px;">
                      <div style="padding:16px 18px;border-radius:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">
                        <p style="margin:0;font-size:14px;line-height:1.7;color:#c7d0da;">
                          ${safeNote}
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding:18px 8px 0 8px;text-align:center;">
                      <p style="margin:0;font-size:12px;line-height:1.6;color:#7f8b97;">
                        GymOS
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!resend || !resendFromEmail) {
    return false;
  }

  const recipients = Array.isArray(to) ? to : [to];
  await resend.emails.send({
    from: resendFromEmail,
    to: recipients,
    subject,
    html,
  });

  return true;
}

export async function sendGymOnboardingWelcomeEmail(input: GymOnboardingWelcomeEmailInput) {
  const gymLabel = input.gymType === "branch"
    ? `${input.gymCount} branches`
    : input.gymName;

  return sendEmail({
    to: input.to,
    subject: `Welcome to GymOS, ${input.ownerName}`,
    html: renderEmailTemplate({
      eyebrow: "GymOS",
      title: "Welcome to GymOS",
      intro: `${input.ownerName}, your ${input.gymType === "branch" ? "branch account" : "gym account"} for ${gymLabel} is now live. You can start managing your operations from the GymOS admin dashboard.`,
      ctaLabel: "Open Admin Dashboard",
      ctaUrl: adminAppUrl,
      secondaryText: "If the button above does not work, open the admin dashboard here:",
      secondaryUrl: adminAppUrl,
      note: `Your onboarding for ${input.gymName} is complete. If you need help getting started, reply to this email and our team can assist.`,
    }),
  });
}

export async function sendStaffAccountCreatedEmail(input: StaffAccountCreatedEmailInput) {
  return sendEmail({
    to: input.to,
    subject: `Your ${input.gymName} account is ready`,
    html: renderEmailTemplate({
      eyebrow: "GymOS",
      title: "Your account has been created",
      intro: `${input.fullName}, your ${input.role} account has been created for ${input.gymName}. You can now access your user dashboard in the GymOS mobile app using the credentials shared by your gym admin.`,
      ctaLabel: "Open Mobile App",
      ctaUrl: mobileAppUrl,
      secondaryText: "If the button above does not work, open the mobile app here:",
      secondaryUrl: mobileAppUrl,
      note: `If you were not expecting this account for ${input.gymName}, please contact your gym administrator before signing in.`,
    }),
  });
}

export async function sendMemberWelcomeEmail(input: MemberWelcomeEmailInput) {
  return sendEmail({
    to: input.to,
    subject: `Welcome to ${input.gymName}`,
    html: renderEmailTemplate({
      eyebrow: "GymOS",
      title: "Welcome to the gym",
      intro: `${input.fullName}, your member profile has been created for ${input.gymName}. You can use the GymOS mobile app to access your dashboard and stay connected with your gym.`,
      ctaLabel: "Open Mobile App",
      ctaUrl: mobileAppUrl,
      secondaryText: "If the button above does not work, open the mobile app here:",
      secondaryUrl: mobileAppUrl,
      note: `If you were not expecting a membership profile for ${input.gymName}, please contact the gym team directly.`,
    }),
  });
}

export async function sendInvoiceReceiptEmail(input: InvoiceReceiptEmailInput) {
  return sendEmail(input);
}

export async function sendMembershipReminderEmail(input: MembershipReminderEmailInput) {
  return sendEmail({
    to: input.to,
    subject: `Membership renewal reminder - ${input.gymName}`,
    html: renderEmailTemplate({
      eyebrow: "Membership Reminder",
      title: "Your membership is expiring soon",
      intro: `${input.memberName}, your ${input.packageName} membership at ${input.gymName} ends on ${input.endDate}. Please contact the front desk to renew and avoid interruption.`,
      ctaLabel: "Open GymOS",
      ctaUrl: mobileAppUrl,
      secondaryText: "If the button above does not work, open GymOS here:",
      secondaryUrl: mobileAppUrl,
      note: `If you have already renewed your membership, please ignore this reminder.`,
    }),
  });
}

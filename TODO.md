## Done / Implemented

- Auth/session flows: signup, login, forgot/reset password, signout, current session lookup, and password update.
- Admin/gym onboarding, multi-branch support, branch creation, and gym filter scoping.
- Members CRUD, active member listing, member deactivation/delete, and diet/exercise plan assignments.
- Package/plan CRUD and member package sales with coupon validation and payment transaction creation.
- Membership lifecycle controls for member packages: pause, resume, cancel, and renew.
- Payments collections, refunds, sales listing, analytics, coupons, and report transaction CRUD.
- Staff accounts with roles, section permissions, compensation fields, email onboarding, update, and delete.
- `employeeSectionPermissions.service.ts` now checks `staff_accounts.section_permissions` instead of always returning false.
- Diet and exercise plan CRUD, PDF upload, shared/member custom plans, and member assignment flows.
- Enquiries CRUD, enquiry followups, general followups CRUD, and related activity logging.
- Dashboard stats.
- Shifts CRUD and shift report.
- Reviews/reference/near-expiry reports, including review update/delete.
- Attendance/check-in system with manual logs and ESSL/biometric integration surface.
- Class scheduling with sessions, trainer assignment, capacity, bookings, update, and delete.
- PT scheduling with trainer/member sessions.
- Invoices with invoice numbering, tax/discount totals, GST metadata, receipt number generation, PDF download, and email receipt body.
- Transactional invoice sequence RPC migration and controller fallback wiring.
- Payroll runs, generated entries, compensation fields, and net calculations.
- Activity logs service, route, page, and expanded coverage for newer and several legacy flows.
- Billing/subscription gates for classes, PT, payroll, coupons, analytics, ESSL integrations, and activity logs.
- Email sending through Resend for gym/staff/member onboarding, invoice/receipt email, and renewal reminders.
- Renewal reminder worker with email delivery, delivery logging, duplicate suppression, retry attempts, exponential backoff metadata, and permanent-failure status.
- General CSV import/export for members, enquiries, payments, and attendance.
- JSON backup export, inspect, and restore endpoints.
- Automated server tests for auth/session middleware, billing gates, member creation, payment collection, attendance check-in, invoice creation, invoices, CSV parsing/export, payment normalization, membership lifecycle helpers, backup validation, and notification retry policy.
- Automated frontend tests for billing helpers, date helpers, gym filter storage, and plan content form-data logic.
- Initial Supabase migration files for membership lifecycle metadata, notification deliveries, and invoice sequencing.
- `/reports/sales` and `/reports/transactions` now route to the dedicated report pages.

## Pending / Incomplete

- WhatsApp/SMS/push notification providers are not implemented.
- No member-facing portal/mobile app exists, despite email copy referencing mobile app URLs.
- No inventory/POS retail module exists.
- No member waivers, PAR-Q, consent forms, document upload, or signature flow exists.
- Full baseline database schema capture is still pending.
- Supabase migrations still need to be applied and verified in the target environment.
- Rust queue app is still only `Hello, world!`.
- Rust queue is not part of root workspaces; root only includes `apps/*` package workspaces, but Rust/Cargo is separate.
- `apps/queue/target` build artifacts are present in the project tree and should likely be ignored/removed from version control if tracked.
- `dev:site` script references a `site` package, but no `apps/site` exists.
- Class scheduling exists, but recurring class generation and waitlists are not implemented.
- PT scheduling exists, but session credit packages, accounting workflow, and trainer workload/calendar depth are limited.
- Payroll exists, but payout approval, payslip generation, attendance-linked salary, and trainer revenue-share automation are limited.
- Advanced membership lifecycle is still pending: expiry job, proration, payment automation, and lifecycle reports.
- Activity logs exist, but coverage should be audited across all older/legacy routes.
- Deeper live route/integration tests against a disposable database are still pending.
- Admin UI for backup restore and table-level restore previews is still pending.

## Recommended Priority Order

1. Apply/verify migrations in Supabase and capture a full baseline database schema.
2. Add deeper live route/integration tests against a disposable database for critical end-to-end flows.
3. Add WhatsApp/SMS/push providers, retries, backoff, and dead-letter handling for notifications.
4. Finish advanced membership lifecycle: expiry job, proration, payment automation, and lifecycle reports.
5. Make activity logs comprehensive across all legacy routes.
6. Build member-facing portal/PWA before mobile app claims in emails.
7. Add an admin UI for backup restore and table-level restore previews.
8. Only then consider Rust workers for notification dispatch, expiry jobs, exports, PDFs, or analytics pre-aggregation.

## Additional Features Worth Implementing

- Membership cards with QR/barcode check-in.
- Front-desk kiosk mode for check-in.
- Outstanding dues dashboard and automated payment reminders.
- Lead pipeline/Kanban for enquiries.
- Trainer calendar view with conflict detection.
- Waitlist and recurring class templates.
- Digital waivers and health declaration forms.
- Member document storage.
- POS/inventory for supplements/merchandise.
- Expense tracking and profit/loss reports.
- Role/permission editor UI with audit visibility.
- Data retention, soft delete/archive, and restore.
- Admin notification center.
- Webhook/outbox table for reliable async jobs.
- Deployment docs and `.env.example`.
- Security hardening checklist: rate limits by route, CSRF posture for cookie auth, audit sensitive actions, secrets hygiene.

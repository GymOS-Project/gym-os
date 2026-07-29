## 📝 Product & Architecture Gaps Checklist

### Major Missing Product Features

- [ ] **Attendance / Check-in system:**  
  No attendance, check-in, gate log, or biometric integration routes/pages found.

- [ ] **Membership lifecycle controls:**  
  No freeze/pause/hold/resume flow for memberships. Current package status is only active | expired | cancelled in `apps/web/src/types/index.d.ts`.

- [ ] **Class scheduling / Group sessions:**  
  No bookable classes, capacity, waitlists, trainer assignment, or recurring class calendars (only "shifts" exist).

- [ ] **PT / Trainer scheduling:**  
  No trainer calendar, client session booking, session credits, or trainer workload views (despite staff accounts existing).

- [ ] **Invoicing / Tax / Receipt generation:**  
  No invoice numbering, GST/tax fields, downloadable receipts, or accounting-grade invoice records (though payments exist).

- [ ] **Member attendance-facing portal/app:**  
  Email copy references a mobile app in `apps/server/src/services/email.service.ts`, but no member-facing/mobile app found in this repo.

- [ ] **Notifications beyond email logging:**  
  Reminder worker in `apps/server/src/jobs/subscriptionNotifier.ts` only logs expiring memberships. No actual WhatsApp/SMS/push sending found. README mentions optional Twilio envs, but no implementation.

- [ ] **Inventory / POS retail:**  
  No supplements, merchandise, stock, vendor, or front-desk POS flows.

- [ ] **Payroll / Staff compensation:**  
  No salary, payout, commission, attendance-based payroll, or trainer revenue share (staff management exists).

- [ ] **Audit trail / Activity log:**  
  No action history for member, payment, plan, refund, etc. changes.

- [ ] **Member forms / Waiver / Consent docs:**  
  No PAR-Q, liability waiver, document upload, or signed consent flow.

- [ ] **Import/export tooling:**  
  Only payment analytics CSV export. No general member import/export, enquiry import, or backup/restore tooling.

---

### Smaller or Notable Gaps

- [ ] **Rust queue app not implemented:**  
  `apps/queue/src/main.rs` is only "Hello, world!".

- [ ] **Worker is still Node/BullMQ:**  
  `apps/server/src/jobs/subscriptionNotifier.ts` runs the actual queue/worker.

- [ ] **No automated tests found:**  
  No `*.test.*`, `*.spec.*`, or `__tests__` found.

- [ ] **No schema/migrations in repo:**  
  Data model is only inferred from code; no migration files found.

- [ ] **Some CRUD surfaces incomplete:**  
  - `staff` has list/create/update but no delete in `apps/server/src/routes/staff.ts`.  
  - `followups` has list/create/update but no delete in `apps/server/src/routes/followups.ts`.  
  - `reviews`, `member_packages`, `transactions` under "reports" are mostly create/list only in `apps/server/src/routes/reports.ts`.

- [ ] **Permissions service stubbed:**  
  `apps/server/src/services/employeeSectionPermissions.service.ts` returns false and appears unfinished/legacy.

- [ ] **Two report pages orphaned:**  
  `apps/web/src/pages/reports/SalesHistoryPage.tsx` and `TransactionsPage.tsx` exist, but `/reports/sales` and `/reports/transactions` routes lead to payment pages in `apps/web/src/App.tsx` instead.

---

### Product Priorities Before Monetization

- [ ] Attendance/check-in
- [ ] Membership freeze/pause/resume
- [ ] Real reminder delivery (WhatsApp/SMS/email)—not just logs
- [ ] Invoice/receipt generation
- [ ] Trainer/PT session scheduling
- [ ] Audit logs
- [ ] Class booking (if gyms run classes)
- [ ] Inventory/POS (if front-desk sales matter)

---

### Rust Guidance for Queues/Workers

**Rust is a good fit for backend work that is:**
- [ ] CPU-heavy
- [ ] Highly concurrent
- [ ] Latency-sensitive
- [ ] Isolated from CRUD API

**Useful Rust Worker Candidates:**
- [ ] Notification dispatcher (renewal/payment/enquiry reminders, welcome messages)
- [ ] Scheduled membership jobs (expiry scans, auto-mark expired packages, daily summaries)
- [ ] Report/export generation (large CSVs, monthly summaries, finance jobs)
- [ ] PDF generation (invoices, receipts, member cards, trainer schedules)
- [ ] Media/file processing (compression, validation, thumbnails)
- [ ] Data sync/integration (CRM, accounting, WhatsApp, webhook retry)
- [ ] Search/indexing (precompute search indexes, denormalized views)
- [ ] Analytics/materialized stats (pre-aggregate metrics)
- [ ] Queue-based email/WhatsApp retry (retries, backoff, dead-letter, failover)
- [ ] Data cleanup/maintenance (archival, deduplication, validation)

**Do NOT move these to Rust yet (keep in Node/Express):**
- [ ] Auth/session handling
- [ ] Simple CRUD endpoints
- [ ] Form-validation-heavy admin APIs
- [ ] Simple Supabase-backed list/create/update routes  
(Current app is mostly CRUD; Rust rewrite is not high-value yet.)

---

### Queue Architecture Notes

- [ ] BullMQ is Node-first: running Rust consumers directly is awkward.
- [ ] If moving to Rust workers, prefer a queue compatible with both runtimes (Redis Streams, RabbitMQ, NATS, Kafka, or Postgres/Supabase outbox).
- [ ] Suggested pattern:
  - [ ] Use Express as API/write layer.
  - [ ] On key events, write a job/event to queue/outbox.
  - [ ] Rust workers consume the jobs.
  - [ ] Workers call providers and update DB with results.
  - [ ] Add retries, idempotency, dead-letter handling.

---

### Suggested First Rust Workers

- [ ] Expiry + reminder worker
- [ ] Payment due reminder worker
- [ ] Enquiry follow-up reminder worker

**Why?**
- [ ] Data model already exists
- [ ] BullMQ job concept is present
- [ ] Jobs are async/background
- [ ] Easy to isolate from main API
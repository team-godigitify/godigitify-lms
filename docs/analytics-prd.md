# Godigitify CRM — Analytics Experience Redesign
## Product Requirements Document

**Status:** Draft for review · **Owner:** CRM Product/Consulting team · **Scope:** Complete redesign of the analytics/dashboard/reporting experience, reusing the existing backend domain model and extending it where the audit found real gaps.

**Reading guide:** §1 is what exists today (verified against code, not assumptions). §2–§13 are the new experience. §14–§16 are the contract with engineering. §17–§23 are the delivery plan. Every widget/KPI/chart/table spec in this document defines: purpose, business question, formula, data source, permissions, states, and drill-down — per the brief's requirement that nothing ships as "just a number."

---

## 1. Current System Audit

This section is a factual record of what exists in `d:\web_all\godigitify-lms` as of this audit, verified by direct code reading (not inferred). File paths are repo-relative to `apps/api` and `apps/web` unless noted.

### 1.1 Domain model (what CRM entities actually exist)

| Model | Purpose | Key fields | Notes |
|---|---|---|---|
| `Branch` | Physical office | `name, city, address, isActive` | Multi-branch ready; currently one branch seeded |
| `User` | All roles, one table | `role (EMPLOYEE\|SUB_ADMIN\|ADMIN), branchId, isActive` | No separate Employee model |
| `LeadSourceType` | Dynamic source list | `name, isActive` | Only structured "campaign" concept that exists |
| `Lead` | Core CRM entity | `status (LeadStatus), leadPriority, dealSizeEstimate, sourceId, branchId, assignedToId, nextFollowUpAt, isProfileComplete, metaAdName, metaLeadgenId, waContactId` | 14 indexes — heavily built for filtering |
| `ClientDeal` | Won-deal record, 1:1 with Lead | `dealValue, servicesSold[], contractStartDate, quotationLink, closedById` | Sole source of revenue data. No `contractEndDate` — no renewal tracking possible today |
| `IntelBrief` | AI prospect-research doc (Claude) | `status, aiOutput, retryCount` | Real differentiator vs. generic CRMs — underused in analytics today |
| `InteractionLog` | Every action on a lead | `type, statusBefore/After, callDurationSecs, isDeleted` | Backbone of nearly all analytics (activity, response time, time-in-stage) |
| `AssignmentHistory` | Reassignment audit trail | `assignedById, assignedToId (bare string, no FK)` | |
| `AuditLog` | System-generated changes | `action, oldValue, newValue` | |

**`LeadStatus` pipeline:** `NEW → ATTEMPTED_CONTACT → CONNECTED → INTERESTED → FOLLOW_UP_SCHEDULED → NEGOTIATING → PROPOSAL_SENT → CLIENT` (win), with `LOST / NOT_INTERESTED / NOT_REACHABLE` as revivable dead-ends and `DUPLICATE` as terminal-exclude. State machine lives in `packages/core/src/lead/stateMachine.ts`.

**Confirmed absent from the schema** (grep + full schema read): no `Campaign`/`Ad` model, no `Notification` model, no `Target`/`Goal` model, no `Attendance`/`Timesheet` model, no lead-scoring field, no tags, no `contractEndDate`/renewal field. Every one of these is required by the brief's dashboards and is listed as new work in §16.

### 1.2 Backend analytics layer (`apps/api/src/routes/analytics/`)

- 8 endpoints: `dashboard, employees, employees/:id, pipeline, sources, follow-ups, confirmed, trend`, plus `export/csv/:type` and `export/pdf/:type` (type ∈ `employees|confirmed` only).
- **Guard:** `authenticate + authorize([ADMIN, SUB_ADMIN])` on every route — **EMPLOYEE has zero access to any analytics endpoint.** The Employee dashboard is built entirely on `/leads`, `/leads/overdue`, `/leads/followups`, `/me/call-stats` — a parallel, narrower data surface.
- **Branch scoping:** `effectiveBranchId()` hard-locks SUB_ADMIN to their own branch on every analytics route; ADMIN may pass any branch or omit for all-branch. This is the *correct* pattern — see §1.5 for where it's inconsistently applied elsewhere.
- **Caching:** Redis cache-aside, `CACHE_TTL=15min` (dashboard/employees/pipeline/sources/confirmed), `COMPLIANCE_TTL=5min` (follow-ups). Invalidation is a blunt `redis.keys("analytics:*")` flush on any lead mutation — correct but coarse (flushes unrelated reports together).
- **Calculations already computed server-side (reuse these, don't reinvent):**
  - `conversionRate = round(confirmed/total × 100, 1 dp)`
  - `performanceScore = confirmationRate×0.5 + followUpComplianceRate×0.3 + max(0, 100 − avgResponseHours×2)×0.2` — a genuine weighted score, already used for Leaderboard ranking
  - `avgDaysInStage` — real time-in-stage funnel metric derived from consecutive `STATUS_CHANGED` `InteractionLog` rows per lead (not a snapshot count)
  - `followUpComplianceRate = (assigned − overdue) / assigned × 100`
  - **Not computed anywhere:** average deal value (`totalDealValue / totalClients`), any forecast, any target-vs-actual, any cohort/renewal metric.
- **Trend endpoint** is the only one using raw SQL (`$queryRaw`) for day-bucketed counts — fine, but not cached and not reused by the export layer.
- **Export** re-runs the *same* service functions used by the cards (good — one calculation, matches §19's data-consistency mandate) but **accepts no period/filter params**, so an export can silently disagree with whatever period is selected on screen. This is the one concrete data-consistency bug found.

### 1.3 Frontend dashboard/analytics layer (`apps/web/src/components/dashboard/`, `app/(dashboard)/{dashboard,analytics}/`)

- **Role branching is a single boolean:** `isManager = ADMIN || SUB_ADMIN` renders `AdminDashboard`; everyone else gets `EmployeeDashboard`. **SUB_ADMIN renders the byte-identical `AdminDashboard` component as ADMIN — there is no SubAdmin dashboard, despite `Branch` being a first-class, already-enforced scoping dimension.** This is the single biggest gap relative to the brief's "three distinct dashboards" mandate — the backend already supports branch-scoped queries; only the UI is missing.
- **`/analytics` is not a distinct experience** — it renders `AdminDashboard` again, under a header, with three export buttons bolted on. No unique chart, table, or filter exists there that isn't already on `/dashboard`.
- **No global filter system exists.** Confirmed by repo-wide search: no `DateRangePicker`, `BranchSelector`, `FilterContext`, or `useFilters` anywhere. Every widget (`PipelineChart`, `TrendChart`, `LeadSourcesChart`, `EmployeePerformanceTable`, `Leaderboard`, `ClientDealsReport`) owns an independent `period` `useState` defaulting to `last30`. Changing one widget's period has zero effect on any other widget on the same page. `branchId` params exist on two hooks (`useDashboardOverview`, `usePipeline`) and a full `useBranches()` hook exists — **none of it is wired to any UI control.**
- **Two confirmed, verified bugs:**
  1. `EmployeeDashboard.tsx:34-50` — the period selector changes the TanStack Query cache key but the actual request URL is a hardcoded string with no period param, so every period selection returns identical data. All stat cards and the recent-leads list are period-selector-inert.
  2. `AdminDashboard.tsx:91-99` — the "Leads This Month" card is bound to `summary.totalActiveLeads` (an all-time active count, not month-scoped) with subtitle "active" and an unfiltered `/leads` link — title, value, and click-through all disagree with each other.
  3. (Related mislabel) "Interested Leads" card links to `?status=NEGOTIATING`, not `INTERESTED`.
- **Charts:** ApexCharts, correct choice per chart (horizontal bar for pipeline, donut for sources, area for trend, combo for calls) but **no shared wrapper** — 5 components each duplicate the `dynamic(() => import("react-apexcharts"), {ssr:false})` boilerplate, each hand-picks its own color palette, and each implements its own loading/empty state with different copy and different visual treatment.
- **Deep-linking works but is narrow.** Every dashboard drill-down link the app produces today uses only `status`, `assignedToId`, `overdue` — and the leads page correctly reads back exactly those three params (nothing more). `sourceId`, date range, and search are UI-only, non-shareable. There is no `branchId` param support anywhere in the leads list.
- **Employee performance detail** (`/analytics/employees/[id]`) is a well-built page (score ring, 8 metric cards, 7-day activity chart, compliance bar, quick-filter chips) but is only reachable from `Leaderboard`/`EmployeePerformanceTable` — not linked from the Employees management list, and not reachable by an employee viewing their own performance.

### 1.4 Navigation, RBAC-UI, and design system

- Sidebar nav is a flat, role-filtered array (`Sidebar.tsx`). Analytics/Import/Employees hidden from EMPLOYEE; Settings ADMIN-only; **"Lead Sources" is visible only to SUB_ADMIN, not ADMIN** — an inconsistency, not a deliberate permission design.
- Frontend RBAC is redirect/hide-only (`useEffect` + `router.replace`), copy-pasted into 5+ pages. A generic `AuthGuard.tsx` component exists that does this correctly and is **never used**. Real enforcement is server-side (`authorize()` middleware) — the frontend checks are UX polish only, not a security boundary, which is fine, but the duplication is a maintenance cost.
- **Duplicate/dead surface area confirmed:** `/employees` vs `/users` (near-identical, `/users` orphaned from nav — leftover from LMS migration); `LeadTable.tsx` (unused, more feature-complete — has clickable sort headers) vs. the inline `LeadTableWithBulk` actually rendered (no working column sort in production); a second, dead notifications drawer in `Header.tsx`; unused shadcn primitives (`select.tsx`, `dropdown-menu.tsx`, `empty-state.tsx`) alongside a fully-adopted hand-rolled component set (`Button`, `Input`, `Modal`, `Badge`, `Pagination`).
- **Notifications have no persistence.** The bell polls `/activity/notifications` every 30s and derives categories client-side; "read" state is a `localStorage` timestamp heuristic — no per-notification read flag, no cross-device sync, no history.
- Design tokens: Tailwind v4 `@theme`, Godigitify purple scale (`--color-primary: #47216b`), no dark-mode token set defined yet.

### 1.5 A real access-control gap (flag for immediate fix, not just redesign)

The analytics module hard-locks `SUB_ADMIN` to their own branch via `effectiveBranchId()`. The **leads list route does not** — `leads/list.ts` allows any non-EMPLOYEE caller (including SUB_ADMIN) to pass an arbitrary `branchId` query filter, meaning a SUB_ADMIN can currently view another branch's raw lead list through the leads page even though they cannot see that branch's analytics. This should be closed independent of the redesign timeline — see §19.

### 1.6 What's good / missing / redundant / confusing — summary judgment

| | Verdict |
|---|---|
| **Good** | Domain model is well-normalized and heavily indexed; `InteractionLog` as an audit trail enables genuine time-in-stage and response-time analytics most CRMs fake; performance-score formula is real and weighted, not vanity; RBAC enforcement on the backend is consistent and correct; Redis caching exists; Meta/WhatsApp ingestion is production-grade (idempotent, round-robin assignment, signature-verified). |
| **Missing** | Target/Goal tracking, structured Campaign entity + ROI, forecasting, persisted notifications, lead scoring, renewal/retention tracking, any global filter system, a distinct SubAdmin experience, a real employee self-performance view. |
| **Redundant** | `/employees` + `/users`, two lead tables, three overlapping overdue-leads query hooks, duplicated currency/role-badge formatting logic in 3 places, dead `AuthGuard`/notification drawer/shadcn primitives. |
| **Confusing** | Two mislabeled stat cards; employee period selector that silently does nothing; SUB_ADMIN branch-scoping inconsistency between analytics and leads; "Lead Sources" nav item only for SUB_ADMIN. |
| **To remove** | Both duplicate pages (keep `/employees`), the unused `LeadTable.tsx`/`AuthGuard.tsx`/dead notification drawer, the three redundant overdue-leads hooks (consolidate to one), ad hoc per-widget period state (replaced by the global filter, §11). |

This audit is the baseline the rest of this document designs against. Nothing below preserves a widget "because it's already there" — each one is re-justified from a business question (per the brief's mandate) using the real backend calculations found above wherever they already exist correctly, and calling out new backend work wherever they don't.

---

## 2. Information Architecture

```
/dashboard                         role-adaptive shell — renders one of three genuinely distinct dashboards
  ├─ AdminDashboard                 (ADMIN)
  ├─ BranchDashboard                (SUB_ADMIN)  ← NEW, branch-scoped, not a clone of Admin
  └─ MyDeskDashboard                (EMPLOYEE)   ← rebuilt, productivity-first, "today" framing

/analytics                          NEW: genuinely distinct deep-dive hub (ADMIN, SUB_ADMIN)
  ├─ /analytics/revenue             revenue & forecasting
  ├─ /analytics/pipeline            funnel, stage timing, risk
  ├─ /analytics/sources             source + campaign ROI
  ├─ /analytics/employees           team performance grid (existing table, promoted to own page)
  ├─ /analytics/employees/[id]      existing employee detail page (kept, now also linked from /employees)
  ├─ /analytics/branches            NEW, ADMIN only — branch comparison
  └─ /analytics/targets             NEW — target setting + attainment

/reports                            NEW: report library, distinct from dashboards (see §9)
  ├─ /reports/[reportId]            saved/scheduled report viewer
  └─ /reports/new                   report builder (filters → columns → schedule)

/leads                              existing, extended: full global-filter support, working sort, saved views
/leads/[id]                         existing, extended: adds Lead Score, Tags, Risk indicator
/clients                            NEW dedicated route (today: filtered /leads only) — deal-centric view
/employees                          existing (kept), /users removed, now links to /analytics/employees/[id]
/employees/[id]                     NEW alias that embeds the analytics detail page — closes the nav gap in §1.3
/settings/branches                  existing
/settings/sources                   existing, extended with Campaign sub-entity (§16)
/settings/targets                   NEW — where targets are set (ADMIN/SUB_ADMIN)
/my-performance                     NEW — Employee's own version of the employee detail page (self-scoped, no analytics-role requirement)
```

**Design principle:** `/dashboard` answers "what do I need to know/do right now" for the logged-in role. `/analytics` answers "help me understand a trend or make a decision" and is explicitly a research surface, not a duplicate of the dashboard. `/reports` answers "give me this dataset regularly, formatted for someone else." These three surfaces reuse the same backend calculations (§19) but serve different intents — this is the actual fix for "analytics page is just the dashboard again."

---

## 3. Admin Dashboard

**Business frame:** executive, company-wide, revenue-and-risk oriented. Default filter: all branches, last 30 days, comparison to prior period.

**Layout (top to bottom):**

1. **Command strip** — 4 KPI tiles that answer "are we on track": Revenue MTD vs Target, Pipeline Value, Win Rate, Leads at Risk. Each has a trend arrow vs. prior period.
2. **Revenue & Forecast row** — Revenue trend chart (actual vs. target line) + Forecast card (weighted pipeline projection, see KPI-14).
3. **Branch Health row** — Branch comparison table (revenue, target attainment %, pipeline health, headcount) — every row clickable to `/analytics/branches?branchId=X`.
4. **Pipeline row** — Funnel chart (stage counts + avg days-in-stage, using the existing `avgDaysInStage` calculation) + Risk list ("Leads stalling >X days in stage").
5. **People row** — Company-wide Leaderboard (top 10 by performance score, existing formula) + "Needs Coaching" list (bottom performers below a configurable score threshold, with the specific weak metric flagged — e.g. "low follow-up compliance" vs "slow response time").
6. **Marketing row** — Source/Campaign ROI table + Lead quality-by-source chart (conversion rate by source, existing `getSourceReport` calculation).
7. **Activity & Alerts row** — Company activity feed + Smart Alerts panel (see §3.1).

### 3.1 Smart Alerts (new)

Rule-based, computed server-side, surfaced identically on dashboard + notification center (single source, §16):

| Alert | Trigger | Severity |
|---|---|---|
| Branch off-target | branch revenue attainment < 70% with <10 days left in period | High |
| Employee overload | employee has >2× branch-median open lead count | Medium |
| Stalled deal | lead in `NEGOTIATING`/`PROPOSAL_SENT` with no interaction in 5+ days | High |
| Source quality drop | a source's rolling-30d conversion rate drops >30% relative to its prior 30d | Medium |
| Compliance breakdown | employee follow-up compliance < 50% | Medium |

Every alert is clickable → the exact filtered list that explains it (e.g. stalled-deal alert → `/leads?status=NEGOTIATING&status=PROPOSAL_SENT&staleDays=5`).

---

## 4. Sub Admin Dashboard

**Business frame:** single-branch operations manager. Every query is transparently branch-locked using the *already-correct* `effectiveBranchId()` pattern from the analytics module — this dashboard is new UI over data access that already exists correctly.

**Layout:**

1. **Branch command strip** — Branch Revenue vs Branch Target, Branch Pipeline Value, Branch Win Rate, Branch Leads at Risk.
2. **My Team row** — Team performance table (reuses `EmployeePerformanceTable`, pre-scoped) + "Needs Help" list: employees with overdue follow-ups or below-threshold performance score, each with the specific weak metric called out (mirrors Admin's coaching list but branch-only).
3. **Workload row** — Open-lead count per employee (bar chart) so a SubAdmin can rebalance assignment — this is a genuinely new chart, not present in today's Admin-clone.
4. **Pipeline row** — Branch funnel + stalled-deal list (same calc as Admin, branch-scoped).
5. **Sources row** — Branch-scoped source/campaign performance.
6. **Attention row** — "Clients requiring attention" (existing clients with no interaction in 14+ days — new query, flagged in §16) + Branch follow-up compliance summary.

**Explicit non-goals for this dashboard:** no cross-branch comparison, no company-wide leaderboard, no target-setting UI (that's ADMIN-only, in `/settings/targets`). This is deliberately narrower than Admin's — the brief is explicit that these must be different experiences, not the same one with a filter pre-applied.

---

## 5. Employee Dashboard ("My Desk")

**Business frame:** today's work, not analytics. Rebuilt from scratch — the current `EmployeeDashboard` is dashboard-shaped but its period selector is dead code (§1.3) and it mixes "my stats" with under-filled analytics ambitions. The redesign commits fully to a to-do-list framing.

**Layout:**

1. **Today strip** — 4 tiles, no period selector at all (the whole point is "right now"): Calls Made Today, Follow-ups Due Today (overdue in red), Hot Leads (score/priority HIGH with no contact in 48h), My Target Progress (this month, %).
2. **Call queue** — ranked list "who to call first" — overdue follow-ups first (oldest first), then hot new leads, then scheduled-today. This is new business logic (§16, ranking function) replacing the current flat "My Recent Leads" list.
3. **My follow-ups** — existing `FollowUpsDueToday` component, kept as-is (already well-built: overdue/upcoming split, tel: quick-call, correct empty state).
4. **My activity** — existing `EmployeeCallChart` (7-day calls/minutes), kept.
5. **My performance** — compact version of the Admin/SubAdmin employee-detail page, scoped to self via the new `/my-performance` route (no analytics-role requirement, since it's the employee's own data — this is the fix for "employees have zero visibility into their own performance score").
6. **My target** — progress bar against their monthly target (once §16's Target model exists) — this directly answers the brief's "how close am I to my target?"

**Explicit non-goals:** no company/branch KPIs, no charts requiring interpretation, no exports, no filters beyond the implicit "today." Every element should be actionable within one click (call, log note, mark done).

---

## 6. KPI Catalog

Format: **Name** — what it measures · formula · source · comparison · click-through. `[existing]` = calculation already correct in `service.ts`, reuse verbatim. `[new]` = requires new backend work (see §16).

| KPI | Formula | Source | Roles | Click-through |
|---|---|---|---|---|
| **Total Leads (period)** `[existing]` | `count(createdAt in range)` | `getDashboardOverview` | All | `/leads?dateFrom&dateTo` |
| **Conversion / Win Rate** `[existing]` | `confirmed/total × 100` | `getDashboardOverview` | All | `/leads?status=CLIENT` |
| **Revenue (period)** `[existing, needs avg-deal-value added]` | `Σ ClientDeal.dealValue where confirmedAt in range` | `getConfirmedReport` | Admin, SubAdmin | `/clients?dateFrom&dateTo` |
| **Avg Deal Value** `[new — trivial]` | `totalDealValue / totalClients` | extend `getConfirmedReport` | Admin, SubAdmin | `/clients` |
| **Pipeline Value** `[new]` | `Σ dealSizeEstimate for leads in non-terminal status` | new query on `Lead` | Admin, SubAdmin | `/leads?status=<open>` |
| **Weighted Forecast** `[new]` | `Σ dealSizeEstimate × stageWinProbability(status)` — probability table configurable, seed from historical `avgDaysInStage`/conversion-by-stage | new service function | Admin, SubAdmin | `/analytics/revenue` |
| **Revenue Target Attainment** `[new]` | `Revenue(period) / Target(period, scope) × 100` | requires Target model | Admin, SubAdmin, Employee (self) | `/analytics/targets` |
| **Overdue Follow-ups** `[existing]` | `nextFollowUpAt <= now, non-terminal` | `getFollowUpCompliance` | All (scoped) | `/leads?overdue=true` |
| **Follow-up Compliance %** `[existing]` | `(assigned − overdue)/assigned × 100` | `getEmployeePerformance` | Admin, SubAdmin, Employee (self) | employee detail page |
| **Avg Response Time (hrs)** `[existing]` | first interaction time − lead created | `getEmployeePerformance` | Admin, SubAdmin, Employee (self) | employee detail page |
| **Performance Score** `[existing]` | `0.5×convRate + 0.3×complianceRate + 0.2×max(0,100−2×respHrs)` | `getEmployeePerformance` | Admin, SubAdmin, Employee (self) | employee detail page |
| **Avg Days in Stage** `[existing]` | consecutive `STATUS_CHANGED` timestamp deltas per lead, averaged per status | `getPipelineAnalysis` | Admin, SubAdmin | `/analytics/pipeline` |
| **Source Conversion Rate** `[existing]` | `confirmed/total × 100` per source | `getSourceReport` | Admin, SubAdmin | `/analytics/sources?source=X` |
| **Campaign ROI** `[new — needs Campaign model]` | `revenue from campaign / ad spend` (spend field new) | new | Admin, SubAdmin | `/analytics/sources?campaign=X` |
| **Lead Score** `[new]` | weighted: profile completeness + source quality + engagement recency + priority | new computed field | All | lead detail |
| **Leads at Risk** `[new]` | non-terminal leads with no interaction in >5 days (configurable) | new query | Admin, SubAdmin, Employee (self) | `/leads?staleDays=5` |
| **Branch Health Score** `[new]` | composite: 40% target attainment + 30% pipeline health (non-stalled %) + 30% follow-up compliance | new | Admin | `/analytics/branches` |
| **Workload Balance** `[new]` | open leads per employee vs branch median | new query | Admin, SubAdmin | workload chart |
| **Renewal/Retention Rate** `[new — needs contractEndDate]` | clients renewed / clients due for renewal in period | new | Admin, SubAdmin | `/clients?renewalDue=true` |

Every KPI tile in the UI must render: value, trend vs. prior comparable period (same length, immediately preceding), color threshold (red/amber/green — thresholds configurable per KPI in `/settings/targets` where applicable), loading skeleton, and a click target. No KPI ships without all five.

---

## 7. Analytics Catalog

Deep-dive pages under `/analytics/*`, each a genuinely different analytical lens (not a dashboard re-render):

| Page | Business question | Key views |
|---|---|---|
| `/analytics/revenue` | Are we going to hit target, and where's the risk? | Revenue-vs-target trend, weighted forecast, deal-value distribution, top open deals by value |
| `/analytics/pipeline` | Where is the pipeline healthy vs. clogged? | Funnel with per-stage avg-days and drop-off %, stalled-deal list, stage-to-stage conversion matrix |
| `/analytics/sources` | Which channels/campaigns are worth the spend? | Source/campaign table (volume, conversion, revenue, ROI once spend tracked), quality trend by source |
| `/analytics/employees` | Who needs coaching, who's ready for more? | Full sortable performance grid (promotes the existing `EmployeePerformanceTable` off the dashboard onto its own page with the global filter bar) |
| `/analytics/branches` (Admin only) | Which branch needs attention? | Branch comparison table + branch health score trend |
| `/analytics/targets` | Are targets realistic, and who's tracking? | Target-setting UI + attainment-vs-target per scope (company/branch/employee) |

---

## 8. Charts Catalog

All charts standardize on ApexCharts through **one new shared wrapper** (`components/charts/ChartCard.tsx`) that owns: consistent loading skeleton, consistent empty-state copy/illustration, consistent error state, theme-driven color palette (pulled from the design-token file, not hand-picked per component), and a consistent header slot (title + optional period badge + optional "View all" link). This directly fixes the fragmentation found in §1.3.

| Chart | Type | Reason | Data | Drill-down |
|---|---|---|---|---|
| Pipeline funnel | Horizontal bar, distributed color | Ranks stage counts, reads as a funnel when ordered by pipeline sequence rather than count-desc (current implementation sorts by count — **change to pipeline-order** for correct funnel reading) | `getPipelineAnalysis` | click bar → `/leads?status=X` |
| Revenue trend | Line (actual) + dashed line (target) | Direct visual answer to "are we on track" | new revenue-by-day + Target model | click point → that day's confirmed deals |
| Lead source donut | Donut | Existing, keep — good for proportion-of-whole at a glance | `getSourceReport` | click segment → `/leads?sourceId=X` |
| Leads created vs. clients (trend) | Area, dual series | Existing, keep | `/analytics/trend` | click point → that day's leads |
| Team activity | Grouped bar | Existing (`EmployeeActivityChart`), keep, now reused per-employee and in aggregate | interaction counts | — |
| Stage timing | Horizontal bar, one bar per stage = avg days | New — currently avg-days is only shown as a table column, not visualized | `avgDaysInStage` | click → leads currently in that stage |
| Workload balance | Bar, employee vs branch median line | New — SubAdmin dashboard | open-lead counts per employee | click bar → `/leads?assignedToId=X` |
| Branch comparison | Bar (revenue) + heatmap (health score) | New | branch aggregates | click → `/analytics/branches?branchId=X` |
| Forecast confidence band | Area with shaded confidence range | New | weighted forecast + historical variance | — |

---

## 9. Reports Catalog

Today, "reports" = 2 export types (Employee, Client Deals), CSV/PDF, unfiltered, one-off manual download. The redesign introduces a **report library** distinct from ad hoc dashboard export:

| Report | Format | Scope | Schedule option |
|---|---|---|---|
| Employee Performance | CSV, PDF | filterable by period/branch (fixes §1.2's export-ignores-period bug) | weekly digest email |
| Client Deals / Revenue | CSV, PDF (PDF currently missing — add) | filterable by period/branch | monthly |
| Pipeline Snapshot | CSV | current stage breakdown + avg-days | — |
| Source/Campaign Performance | CSV | filterable by period | monthly |
| Branch Comparison (Admin only) | PDF | company-wide | monthly |
| Daily Digest (existing `dailyReport.ts` job) | Email | per-employee + per-manager | already exists — surface it as a viewable report in `/reports`, not just an email |

Every report in the library must call the **same service functions** as the dashboard equivalent (§19) — the report builder should not introduce a second calculation path.

---

## 10. Tables

Spec pattern applied to every data table (Leads, Employees, Client Deals, Branch comparison, Employee performance grid):

- **Columns:** business-relevant, role-dependent (e.g. Employee's own leads table hides the "Counsellor" column since it's redundant)
- **Sorting:** every column header clickable (fixes §1.3's dead sort-header bug — wire the already-built `LeadTable.tsx` sort UI into the live table, retiring the duplicate)
- **Search:** debounced (fixes the current fires-on-every-keystroke leads search)
- **Filtering:** consumes the global filter bar (§11), not a local ad hoc filter panel
- **Bulk actions:** role-gated, existing pattern (`bulk-assign`, `bulk-status`) extended to Client Deals (bulk export, bulk reassign closer)
- **Saved views:** new — per-user, per-table named filter presets, persisted server-side (not localStorage, so they follow the user across devices) — this is new schema (§16)
- **Pagination:** existing `Pagination.tsx` pattern, keep
- **Column chooser:** new for the Employee Performance grid (dense table, benefits most)
- **Sticky first column + header:** new for wide tables (performance grid, branch comparison)
- **Export:** every table gets a "export this view" action using its current filter state (closes the gap in §1.3 where only `/analytics` has export)
- **Permissions:** table-level (who sees the table at all) + column-level (e.g. deal value hidden from EMPLOYEE unless it's their own deal)

---

## 11. Global Filters

**The single most important structural fix.** One filter context (`FilterProvider`, React context + URL-param sync) that every dashboard widget, analytics page, table, and export consumes — replacing the current per-widget local `period` state found in 7+ separate components.

| Filter | Type | Applies to |
|---|---|---|
| Date range | preset (Today/7d/30d/90d) + custom range (currently unreachable "custom" option — implement it) | everything |
| Branch | dropdown, ADMIN only (SubAdmin/Employee implicitly locked, per §1.5's fix) | everything |
| Employee | dropdown/search | everything except company-wide-only views |
| Lead Source | dropdown | leads, sources, pipeline |
| Campaign | dropdown (once §16's Campaign model ships) | sources |
| Status | multi-select | leads, pipeline |
| Priority | multi-select | leads |
| Tags | multi-select (once §16's Tag model ships) | leads |
| Lead Score | range slider (once §16's scoring exists) | leads |
| Industry | dropdown (field already exists on `Lead`, currently never used as a filter — quick win) | leads, sources |
| Region | dropdown (new field, or derived from Branch.city until a real region hierarchy is needed) | leads, branches |
| Service | multi-select from `ClientDeal.servicesSold` | clients, revenue |
| Custom fields | dynamic, once any custom-field system exists (not currently in scope — flagged in §23) | leads |

**Behavior:** changing any filter updates the URL query string (shareable/bookmarkable), and every widget on the page re-queries against the same filter state — cards, charts, tables, and the export button all read from the same context, so an export always matches what's on screen. This is the mechanism that fixes §1.2's "export ignores period" bug and §1.3's "widgets disagree with each other" bug simultaneously.

---

## 12. Navigation Flow

- Sidebar becomes role-driven from a single `NAV_CONFIG` (keep the existing array pattern — it's fine — but fix the "Lead Sources" ADMIN-visibility inconsistency and remove the orphaned `/users` entry).
- `/dashboard` is the landing page post-login for all roles (unchanged).
- `/analytics` becomes a real hub with its own left-rail sub-nav (Revenue / Pipeline / Sources / Employees / Branches / Targets) rather than a single flat page.
- `/reports` is a new top-level nav item for ADMIN/SUB_ADMIN.
- `/my-performance` is a new nav item for EMPLOYEE only, replacing nothing (additive).
- Employee list rows link to `/employees/[id]` which embeds the existing analytics detail page — closing the current disconnect between "manage employees" and "see employee performance."

---

## 13. Drill-down Flow

Every clickable surface must resolve to a pre-filtered destination using the global filter context (§11), not the current three-param-only support. Concretely, this requires the leads list to read back **every** filter param from the URL, not just `status`/`assignedToId`/`overdue` (§1.3 finding). Standard drill-down map:

| Click target | Destination |
|---|---|
| KPI tile | filtered list matching the tile's exact definition |
| Chart bar/segment/point | filtered list matching that category |
| Table row (employee) | `/employees/[id]` (performance detail) |
| Table row (lead/client) | `/leads/[id]` |
| Table row (branch) | `/analytics/branches?branchId=X` |
| Leaderboard entry | `/employees/[id]` |
| Alert | the exact filtered list that produced the alert |
| Trend point | that day's underlying records |
| Percentage/rate | the numerator list (e.g. clicking a conversion rate shows the confirmed leads, not the whole denominator) |

---

## 14. Role Permissions

| Capability | Employee | Sub Admin | Admin |
|---|---|---|---|
| View own dashboard/performance | ✓ | ✓ | ✓ |
| View branch dashboard/analytics | ✗ | ✓ (own branch only) | ✓ (any/all) |
| View company-wide analytics | ✗ | ✗ | ✓ |
| Set employee targets | ✗ | ✓ (own branch employees) | ✓ |
| Set branch/company targets | ✗ | ✗ | ✓ |
| Export reports | ✗ (own data only, once §16 self-export ships) | ✓ (branch-scoped) | ✓ |
| Create/schedule reports | ✗ | ✓ | ✓ |
| Manage Campaigns | ✗ | ✓ | ✓ |
| View branch comparison | ✗ | ✗ | ✓ |
| Manage saved views | own only | own only | own only |

This is an extension of the existing, already-correct backend pattern (`authenticate + authorize([...])`) — no new enforcement mechanism needed, just new route guards following the established convention, plus closing the §1.5 branch-scoping gap on the leads list route.

---

## 15. API Requirements

**Reuse verbatim** (already correct): `GET /analytics/dashboard`, `/employees`, `/employees/:id`, `/pipeline`, `/sources`, `/follow-ups`, `/confirmed`, `/trend`.

**Extend:**
- `GET /analytics/export/{csv,pdf}/:type` → accept `period, dateFrom, dateTo, branchId` (fixes §1.2 bug); add `type=pipeline`, `type=sources`; add PDF for `confirmed`.
- `GET /analytics/confirmed` → add `avgDealValue` to summary.
- `leads/list.ts` → close the SUB_ADMIN branch-override gap (§1.5); accept the full filter set from §11 (`sourceId, tags, leadScore range, industry, region, priority[]`) and echo them correctly on reload.

**New:**
- `GET /analytics/revenue` — target-vs-actual + forecast
- `GET /analytics/branches` — branch comparison + health score (ADMIN only)
- `GET|POST /targets` — CRUD for Target model, scoped by role
- `GET|POST /campaigns` — CRUD for Campaign model
- `GET /leads/:id/score` or a computed field on lead responses — Lead Score
- `GET|POST /saved-views` — per-user filter presets
- `GET /notifications`, `POST /notifications/:id/read` — real persisted notification model, replacing the localStorage heuristic
- `GET /reports`, `GET /reports/:id`, `POST /reports` — report library CRUD

All new endpoints follow the existing `authenticate + authorize([...])` + `effectiveBranchId()` pattern — no new auth mechanism.

---

## 16. Database Requirements

**New models required** (Prisma, additive migrations only — nothing in §1.1 needs to be dropped):

```prisma
model Target {
  id        String   @id @default(cuid())
  scope     TargetScope   // COMPANY | BRANCH | EMPLOYEE
  scopeId   String?       // branchId or userId, null for COMPANY
  metric    TargetMetric  // REVENUE | LEADS | CONVERSIONS
  period    String        // "2026-07" monthly bucket
  value     Decimal
  createdById String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([scope, scopeId, period])
}

model Campaign {
  id          String   @id @default(cuid())
  name        String
  sourceId    String   // → LeadSourceType
  metaCampaignId String? @unique
  spend       Decimal?
  startDate   DateTime
  endDate     DateTime?
  isActive    Boolean  @default(true)
  leads       Lead[]
  @@index([sourceId])
}
// Lead gains: campaignId? → Campaign?, tags String[], leadScore Int?

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String
  message   String
  linkUrl   String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  @@index([userId, isRead])
}

model SavedView {
  id        String   @id @default(cuid())
  userId    String
  entity    String   // "leads" | "employees" | ...
  name      String
  filters   Json
  createdAt DateTime @default(now())
  @@index([userId, entity])
}

// ClientDeal gains: contractEndDate DateTime? (enables renewal/retention analytics)
```

**Migration order:** additive, no destructive changes to existing tables — every new field on `Lead`/`ClientDeal` is nullable so existing rows remain valid. `AssignmentHistory.assignedToId` and `Lead.confirmedById` should also get proper `@relation` FKs while touching this area (currently bare strings — a data-integrity gap noted in §1.1, cheap to fix alongside this work).

---

## 17. Missing Features (recommendations beyond the current implementation)

Beyond what's captured in the KPI/Analytics catalogs above:

- **Renewal/retention pipeline** — once `contractEndDate` exists, a "renewals due in 30/60/90 days" view is a natural addition for an agency business model (recurring service contracts).
- **Customer satisfaction signal** — no CSAT/NPS capture exists anywhere; even a lightweight post-project rating on `ClientDeal` would feed a retention-risk score.
- **Competitor/win-loss reason capture** — `LOST`/`NOT_INTERESTED` transitions don't currently require a reason; adding a required `lossReason` on that transition (small `InteractionLog`/state-machine change) unlocks "why are we losing leads" analytics the brief explicitly asks for.
- **IntelBrief-driven lead scoring** — the AI brief already assesses "brand maturity"/"engagement" per prospect; feeding that into the new Lead Score (§16) instead of treating IntelBrief as a standalone tab would make the AI differentiator actually influence prioritization, not just inform conversation.

---

## 18. UI/UX Improvements

- Consolidate `/employees` + `/users` into one page; delete the orphan.
- Wire the already-built sortable `LeadTable.tsx` into the live leads page; delete the duplicate `LeadTableWithBulk`.
- Adopt `AuthGuard.tsx` for all role-gated pages instead of the 5 copy-pasted `useEffect` redirects.
- Remove the dead second notifications drawer in `Header.tsx`.
- Finish the shadcn migration (commit to `Select`/`DropdownMenu` since `components.json` and the dependency already exist) rather than leaving two parallel component systems — or explicitly delete the unused shadcn files if the hand-rolled system is the long-term choice. Recommend finishing the migration given the effort already sunk into `components.json`.
- Centralize currency formatting (`formatRupees`, duplicated in 2+ places) and role-badge color mapping (duplicated in 3 places) into shared utilities.
- Fix the two mislabeled stat cards (§1.3) as part of this redesign, not as a separate hotfix, since their replacements are defined in §6's KPI catalog.

---

## 19. Data Consistency Rules

Non-negotiable, per the brief:

1. **One calculation, many renderings.** Every KPI/metric has exactly one service function (`apps/api/src/routes/analytics/service.ts` and its extensions). Dashboard cards, analytics pages, tables, CSV, PDF, and notifications all call that function — never re-derive a number client-side (the one exception today, `EmployeeDashboard`'s client-side status filtering of an 80-row lead page, should be replaced with a real backend query as part of the Employee dashboard rebuild in §5).
2. **Exports must match screen state.** Fixed by §11's global filter context + §15's export param extension — an export always reflects the filters visible on screen at the moment of export.
3. **Branch scoping must be uniform.** Every route that touches `Lead`/analytics data applies the same `effectiveBranchId()` pattern (§1.5's leads-list gap is closed as part of this work, not deferred).
4. **Cache invalidation stays correct-but-coarse is acceptable** (flush `analytics:*` on lead mutation) as long as TTLs stay short enough that staleness never exceeds business tolerance (15 min today — keep, revisit only if targets/forecasts need tighter freshness).

---

## 20. Performance Optimizations

- Keep the existing parallelized-query pattern (`Promise.all`) in every new service function — it's already the right pattern, just replicate it.
- New aggregate queries (branch comparison, forecast) should reuse `groupBy` where possible rather than N+1 per-branch loops, following the existing `getSourceReport`/`getPipelineAnalysis` style.
- Global filter changes should debounce network requests (300ms) for text/range filters; discrete filters (dropdowns, date presets) fire immediately.
- Cache the new `/analytics/revenue` and `/analytics/branches` endpoints at the same 15-min TTL tier as the existing five.
- Chart components should share the single `ChartCard` wrapper's lazy-loaded ApexCharts import rather than each bundling its own dynamic import (marginal bundle-size win, but removes 5x duplicated boilerplate).

---

## 21. Implementation Roadmap

| Phase | Scope | Depends on |
|---|---|---|
| 0 | Close the branch-scoping gap (§1.5); fix the two mislabeled cards; fix the Employee dashboard period bug — ship independently, don't block on the redesign | — |
| 1 | Global Filter context + URL sync (§11); wire it into existing widgets in place | Phase 0 |
| 2 | Shared `ChartCard` wrapper; retrofit existing 5 charts | Phase 1 |
| 3 | Schema additions: `Target`, `Notification`, `SavedView`, `ClientDeal.contractEndDate` (additive, low risk) | — |
| 4 | Sub Admin Dashboard (net-new component, branch-scoped, reuses existing backend) | Phase 1 |
| 5 | Employee "My Desk" rebuild + `/my-performance` | Phase 1, 3 |
| 6 | `/analytics` hub restructure (Revenue/Pipeline/Sources/Employees/Branches/Targets sub-pages) | Phase 1, 3 |
| 7 | `Campaign` model + source/campaign ROI | Phase 3 |
| 8 | Lead Scoring + Tags | Phase 3, IntelBrief integration |
| 9 | Reports library (`/reports`) | Phase 6 |
| 10 | UI/UX cleanup pass: dead-code removal, shadcn consolidation, currency/role-badge utility consolidation | Any time after Phase 2 |
| 11 | QA pass: every KPI cross-checked card ↔ table ↔ export ↔ API per §19 | Final |

Each phase should ship independently reviewable and behind no long-lived feature flags — additive schema changes and net-new routes mean nothing here requires a big-bang cutover.

---

## 22. Acceptance Criteria

- [ ] SUB_ADMIN sees a dashboard visually and functionally distinct from ADMIN's, correctly branch-scoped, with no cross-branch data ever visible (including via the leads list — §1.5 closed).
- [ ] EMPLOYEE dashboard requires zero interpretation — every element is either "do this now" or "here's my own number," no company/branch aggregates.
- [ ] Changing any filter in the global filter bar updates every card/chart/table on the page simultaneously, including the export button's output.
- [ ] Every KPI value shown on a dashboard card matches the same value in its corresponding table row, CSV export, and PDF export, for the same filter state, exactly.
- [ ] Every chart bar/point/segment, every table row, every KPI tile is clickable and lands on a correctly pre-filtered destination.
- [ ] No dead code remains: `/users`, unused `LeadTable.tsx`, unused `AuthGuard.tsx`, dead notification drawer, redundant overdue-leads hooks are removed.
- [ ] `EmployeeDashboard`'s period selector (or its replacement) visibly changes displayed data.
- [ ] The "Leads This Month" and "Interested Leads" cards show accurately-labeled, correctly-filtered data.
- [ ] Notifications persist server-side with real per-notification read state, replacing the localStorage heuristic.

---

## 23. Future Enhancements

- Custom-field system (mentioned as a global filter dimension in §11 but genuinely out of scope until a custom-field framework exists on `Lead`).
- Predictive lead scoring via a trained model rather than a rule-based weighted score, once enough historical `InteractionLog`/outcome data accumulates.
- Multi-currency support if Godigitify expands beyond INR-denominated deals.
- Cross-branch employee comparison/benchmarking (deliberately excluded from SubAdmin's dashboard in §4 — would need a separate ADMIN-only "cross-branch talent" view if ever requested).
- Real-time (WebSocket) dashboard updates instead of the current poll/cache-TTL model, if 15-minute staleness ever becomes a business problem.
- Mobile-native push notifications, once the persisted `Notification` model (§16) exists as the backing store.

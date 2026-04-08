# Pakistan National Energy Security — Crisis Simulation & Decision Support App
## Master Brief for Claude Code Agent Swarm

**Version:** 1.0
**Date:** April 2026
**Classification (in-app):** CONFIDENTIAL — National Energy Security Working Group
**Owner:** Rahim (Chief AI Officer / Assistant Professor, AI & Public Policy)
**Source document:** Terms of Reference, National Energy Security Working Group — Crisis Planning for Middle East Supply Chain Disruption (April 2026, attached separately)

---

## 0. How to read this brief

This document is the **complete, self-contained context** for an agent swarm to research, design, and build a working prototype of the Pakistan Energy Crisis Simulation & Decision Support System. It is designed so the swarm does **not** need to ask the human for clarification on scope, architecture, baseline data, or numerical assumptions before starting.

Anything marked **[ASSUMPTION — flag in UI]** is a reasoned default that must be visible and editable in the app, with a tooltip showing the source/justification. Anything marked **[VERIFY]** is a number that should be re-checked by a research agent against the latest source before being hardcoded.

The decisions in Sections 2 and 3 are **already settled**. Do not revisit them. Build to them.

---

## 1. The situation this app is being built for

The world this app exists in (as of April 2026):

- **28 February 2026:** US and Israel launched Operation Epic Fury against Iranian military, nuclear, and command facilities. Supreme Leader Ali Khamenei was killed.
- **Strait of Hormuz:** Effectively closed since 4 March 2026 — not by physical blockade alone, but by withdrawal of marine insurance, mining of approaches, and IRGC interdiction. Ship transits dropped from ~130/day in February to ~6/day in March.
- **Brent crude:** Pre-war ~$71/bbl (27 Feb). Spiked to ~$126/bbl peak. Currently trading $109–113/bbl. Dubai physical at ~$126 (76% above pre-war). [VERIFY current spot at build time]
- **Insurance:** War-risk premiums for Strait transits rose from 0.125% to 0.4%+ of hull value. For a VLCC, that's ~$30k → ~$400k per transit. Daily ship rates have moved from ~$900k to ~$4M.
- **Iran's posture:** On 26 March 2026, Iran's Foreign Minister announced ships from China, Russia, India, Iraq, **Pakistan**, Malaysia, and Thailand would be permitted through Hormuz under specific arrangements (often Chinese-flagged hulls, payments in CNY through IRGC channels). One Pakistani tanker crossed on 16 March. **This is materially different from the ToR baseline assumption (full corridor compromised) and the app must support both worldviews as toggleable scenarios.**
- **Pakistan's position as of last public briefing (Senate Standing Committee, mid-March 2026):**
  - Crude oil reserves: **11 days of cover**
  - Diesel (HSD): **21 days** (later updated to 23–24 days)
  - Petrol (MS): **27 days**
  - JP-1 (jet fuel): **14 days**
  - LPG: **9 days**
  - LNG: cargoes from Qatar suspended since 2 March; supplies expected to run out around 14 April
  - 70% of petroleum is normally sourced from the Middle East
  - International HSD price has roughly doubled ($88→$187), petrol +75% ($74→$130)
  - Government raised pump prices Rs 55/L (~20%) once already
  - Two Pakistani vessels were stranded in the Strait
  - PSO has launched tenders for petrol and diesel from outside Hormuz
  - Pakistan is in talks with Iran for transit permission and with Saudi Arabia for Red Sea routing
  - Subsidy of Rs 23B announced for motorcycle/rickshaw owners
- **Macro:** SBP reserves $16.38B (week ending 27 March 2026), total liquid $21.79B, ~2.6 months import cover. IMF EFF + RSF active, $1.2B disbursed in December 2025. PKR ~280/USD, but under pressure. Inflation was 5.6% pre-war; the PIDE estimate is that a sustained Hormuz closure could push inflation to 17% and the monthly oil import bill to $3.5–4.5B.

This is not a hypothetical exercise. The crisis is live. The app must be usable **this week** by Working Group analysts to run scenarios for the Committee.

---

## 2. Settled architectural decisions (do not revisit)

| # | Decision | Rationale |
|---|---|---|
| 1 | **Primary surface:** interactive web app (single-page, scenario-driven). | The Excel deliverable in the ToR is a formal handoff artifact, not the working tool. The Working Group needs sliders, real-time recomputation, and visualization to actually run scenarios. |
| 2 | **Secondary deliverable:** one-click Excel export of the full model with all 8 modules interlinked. | This is what satisfies the ToR's formal deliverable language and what the Committee will be handed in print. |
| 3 | **User:** Working Group analyst building scenarios. Single-user, single-session prototype. | Optimize for input flexibility, scenario iteration, and clear traceable assumptions — not for executive dashboards (yet). |
| 4 | **No persistence, no auth, no multi-user.** State lives in browser memory for the session. Scenarios can be saved/loaded as JSON files the user downloads/uploads. | v1 prototype scope. |
| 5 | **All baseline data is editable** in the UI with clear "default vs. override" indication. Every default has a tooltip with source and date. | This is a decision-support tool for senior analysts, not a black box. They must be able to challenge every number. |
| 6 | **Iranian corridor is modeled fully** (maritime under Chinese flag, overland Taftan, degraded production scenarios). It is treated as analytically necessary, not politically endorsed. The UI surfaces it neutrally as "Module 5: Iran-Specific Corridors". | Required by ToR. Section 5 below. |
| 7 | **Conservation matrix X-values are pre-filled** with proposed defaults (Section 8) and clearly marked editable. Each value has a reasoning tooltip. | Per user instruction: propose numbers with reasoning. |
| 8 | **The trigger function (Module 8) is the heart of the app** and gets a dedicated visualization panel showing the live state of all five inputs and the current computed level. | This is what the Committee will actually look at. |
| 9 | **Two baseline assumption modes:** (a) "Full Corridor Compromised" — the strict ToR baseline; (b) "Iran-Permitted Transit" — the current real-world situation where Pakistani-flagged or Chinese-insured vessels can move. User toggles between them at the top of the app. | The world has moved since the ToR was drafted. The app must serve both planning realities. |
| 10 | **Tech stack:** Next.js 14+ (App Router) + TypeScript + Tailwind + shadcn/ui for the app shell; Recharts for charts; Zustand for scenario state; SheetJS (xlsx) for Excel export; Framer Motion for transitions. No backend. Deploy-ready as a static export. | Aligns with Rahim's existing stack preferences (Vite/React/editorial-minimalist aesthetic). Next.js gives slightly better app structure for the modular layout. If the swarm prefers Vite + React Router for closer alignment with Rahim's other projects, that's acceptable — but pick one and commit. |
| 11 | **Visual aesthetic:** editorial-minimalist, government-serious. Off-white background, generous whitespace, IBM Plex Sans / Inter for UI, IBM Plex Mono for numbers, restrained accent palette (deep navy, muted red for alerts, ochre for warnings). No gradients, no glassmorphism, no playfulness. This is a document the DG ISI might see. | Matches Rahim's design sensibility and the gravity of the use case. |
| 12 | **Currency:** all monetary inputs/outputs in USD by default with PKR equivalents shown alongside at user-configurable exchange rate (default 280 PKR/USD). | Oil markets are USD-denominated; forex constraint module needs USD natively. |

---

## 3. Application structure

### 3.1 Top-level layout

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Classification banner • Scenario name • Save/Load  │
│         • Baseline mode toggle • Date • Export to Excel     │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  LEFT NAV    │  MAIN PANEL (selected module)                │
│              │                                              │
│  • Dashboard │  Inputs (left)  │  Outputs/Charts (right)    │
│  • M1 Inv    │                                              │
│  • M2 Pipe   │                                              │
│  • M3 Refine │                                              │
│  • M4 AltSrc │                                              │
│  • M5 Iran   │                                              │
│  • M6 Price  │                                              │
│  • M7 Conserve                                              │
│  • M8 Trigger│                                              │
│  • Scenarios │                                              │
│  • Report    │                                              │
├──────────────┴──────────────────────────────────────────────┤
│  STATUS BAR: Days-of-cover • Current trigger level •         │
│  Brent spot • SBP reserves remaining • Last computed         │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Dashboard (default landing view)

Six "vital signs" cards across the top:
1. **Days of Fuel Cover** (weighted across HSD/MS/FO) — big number, sparkline of last 30 days projection at current burn
2. **Brent Spot** (USD/bbl) — with delta vs. pre-war baseline
3. **SBP Usable Reserves** (USD bn) — with months-of-imports cover at current crisis price
4. **Active Trigger Level** — Normal / Alert / Austerity / Emergency, with countdown to next escalation if conditions worsen
5. **Cargoes In Transit** — count by status bucket (Module 2), with risk-weighted volume
6. **Iranian Corridor Status** — Open / Degraded / Closed, with current daily throughput estimate

Below the cards:
- **Depletion curves chart** — multi-line: HSD, MS, FO, Crude. X-axis: days from today. Y-axis: days-of-cover. Lines for each conservation level scenario (None / Alert / Austerity / Emergency) drawn on the same chart so the analyst can see the impact of each policy posture.
- **Supply-price affordability curve** (from Module 6) — small chart on the right.
- **Recommendation banner** at the bottom: "Module 8 trigger function recommends: [LEVEL]. Reason: [breakdown]."

### 3.3 Module panels (M1–M8)

Each module is a full panel with three sections:
- **Inputs** (left, ~30% width): editable parameters with defaults, units, source tooltips
- **Computed outputs** (top right, ~40% width): derived values, formula breakdowns
- **Visualization** (bottom right, ~70% width × half height): chart specific to the module

Every input field has:
- Default value
- Unit
- Source tooltip (where the default came from)
- "Reset to default" button
- Visual indicator if the user has overridden the default

### 3.4 Scenario Manager

A panel where users can:
- Save the current set of inputs as a named scenario (downloads as JSON)
- Load a previously saved scenario (uploads JSON)
- Run the four ToR-mandated scenarios as preconfigured presets:
  - **Scenario A:** Partial Hormuz closure (50% throughput, 30-day duration)
  - **Scenario B:** Complete Hormuz closure (0% throughput, 90-day duration) — **the ToR baseline**
  - **Scenario C:** Wider Gulf conflict with energy infrastructure damage (Iranian production at 25%, Saudi Eastern Province refineries degraded, Qatari LNG offline)
  - **Scenario D:** Combined supply-and-price shock (complete Hormuz closure + Brent at 4x pre-war = ~$280)
- Compare two scenarios side-by-side

### 3.5 Report panel

A printable, formatted view that compiles the current scenario into a structured analysis matching the ToR's "Scenario Analysis Report" deliverable. Should look like a government document — title block, classification banner, table of contents, sections for each module, executive summary at the top, recommendations at the bottom. Print-to-PDF clean.

---

## 4. Module specifications with baseline data

### Module 1 — Domestic Fuel Inventory

**Inputs (with defaults):**

| Parameter | Default | Unit | Source |
|---|---|---|---|
| Crude oil stock (Karachi + Port Qasim terminals) | 4,650,000 | barrels (~11 days × 423 kbpd × refinery share) | Senate Petroleum Committee briefing, March 2026 |
| HSD stock (refineries + OMC depots) | 600,000 | tonnes (≈ 23 days cover) | Finance Committee briefing, late March 2026 |
| MS (petrol) stock | 540,000 | tonnes (≈ 27 days cover) | Senate Petroleum Committee briefing, March 2026 |
| Furnace oil stock | 350,000 | tonnes [ASSUMPTION — flag in UI; FO demand collapsed post-2017 LNG shift] | Estimated from refinery output residuals |
| LPG stock | 45,000 | tonnes (≈ 9 days) | Senate Petroleum Committee briefing |
| JP-1 stock | 110,000 | tonnes (≈ 14 days) | Senate Petroleum Committee briefing |
| Trailing 30-day HSD consumption | 26,000 | tonnes/day | Pakistan Oil Report / OCAC [VERIFY] |
| Trailing 30-day MS consumption | 20,000 | tonnes/day | Pakistan Oil Report / OCAC [VERIFY] |
| Trailing 30-day FO consumption | 8,000 | tonnes/day [ASSUMPTION — post-LNG shift] | OCAC |
| Total petroleum consumption | 423,000 | barrels/day | CEIC, Dec 2024 |

**Computed outputs:**
- Days-of-cover by product, at four conservation levels (None, Alert, Austerity, Emergency)
- Depletion curve (date → remaining stock) for each product
- Total fuel days-of-cover (weighted average of HSD, MS, FO at consumption-weighted ratio)

**Conservation level demand reductions** (applied to consumption rates):
| Level | HSD reduction | MS reduction | FO reduction |
|---|---|---|---|
| None | 0% | 0% | 0% |
| Alert | 8% | 12% | 5% |
| Austerity | 22% | 35% | 15% |
| Emergency | 40% | 60% | 25% |

These percentages are derived from the Module 7 conservation matrix below — **they must be computed from M7 inputs, not hardcoded twice**.

### Module 2 — Seaborne Supply Pipeline

**Data structure:** an editable table of cargoes, each row with:
- Vessel name
- IMO number
- Crude grade or product
- Quantity (barrels and tonnes)
- Loading port
- ETA
- Insurer
- Flag state
- Status: `docked` / `in_war_zone` / `outside_war_zone` / `contracted_not_dispatched`
- Loss probability (auto-set by status, manually adjustable)

**Default loss probabilities by status (and corresponding default values):**
| Status | Default loss probability | Reasoning |
|---|---|---|
| Docked / entering Pakistani port (within 24h) | 2% | Effectively quasi-inventory; risk is residual port operations only |
| In transit, in war zone | 35% [ASSUMPTION] | Reflects current war-risk insurance pricing implied loss expectation; rises with conflict intensity |
| In transit, outside war zone | 5% | Standard maritime risk |
| Contracted, not dispatched | 15% | Force majeure, seller default, port closure |

**Seed data: 8 plausible cargo records** as defaults so the analyst sees a working pipeline immediately. The swarm should construct these as realistic representative records (not real PSO contracts) — e.g., "MT Karachi Star, IMO 9XXXXXX, Arab Light, 1.0M bbl, ex-Ras Tanura, ETA 18 April, Lloyd's, Pakistan flag, in_war_zone, 35%". Make clear in the UI that these are illustrative seeds, not actual PSO cargoes.

**Computed outputs:**
- Total expected (probability-weighted) barrels arriving in next 30 days, by product
- Risk-adjusted days of cover added by pipeline
- Cargo timeline visualization

**Baseline mode handling:**
- "Full Corridor Compromised" mode: forces all war-zone cargoes to ≥40% loss probability
- "Iran-Permitted Transit" mode: allows Pakistan-flagged or Chinese-insured cargoes in war zone to drop to 15%

### Module 3 — Crude Oil Conversion Matrix

This is the most technically delicate module. The yield matrix defines, for each refinery × crude grade combination, the percentage output of each finished product.

**Pakistani refineries (with capacities, technology, and crude diet):**

| Refinery | Capacity (bpd) | Technology | Nelson Index [VERIFY] | Default crude diet |
|---|---|---|---|---|
| PARCO MCR (Mahmoodkot) | 120,000 | Mild conversion | 6.5 [ASSUMPTION] | Arab Light, Upper Zakum, Murban, Das, indigenous |
| Cnergyico (Hub, Balochistan) | 156,000 | Hydroskimming | 2.0 [ASSUMPTION] | Arab Light, Iranian Light |
| NRL (Korangi, Karachi) | 64,000 | Hydroskimming + lube | 4.5 [ASSUMPTION] | Arab Light, indigenous |
| ARL (Rawalpindi) | 53,400 | Hydroskimming | 3.5 [ASSUMPTION] | Indigenous (Toot, Khaur) + light import |
| PRL (Korangi, Karachi) | 50,000 | Hydroskimming | 3.0 [ASSUMPTION] | Arab Light, Murban |
| **Total nameplate** | **443,400** | | | |

**Note:** Cnergyico is the largest by nameplate. PARCO is the most complex. Four out of five are hydroskimmers built decades ago, designed for **light sweet Middle East crude**. This is the central refining vulnerability the app has to expose.

**Yield matrix (% output by product, on hydroskimming average; PARCO gets +5% diesel and -5% FO due to mild conversion):**

| Crude grade | LPG | Naphtha/Petrol | HSD | JP-1/Kero | FO | Loss |
|---|---|---|---|---|---|---|
| Arab Light (baseline) | 2 | 18 | 45 | 5 | 28 | 2 |
| Arab Heavy | 1 | 14 | 38 | 4 | 41 | 2 |
| Iranian Light | 2 | 17 | 43 | 5 | 31 | 2 |
| Iranian Heavy | 1 | 13 | 36 | 4 | 44 | 2 |
| Murban (UAE) | 3 | 22 | 47 | 5 | 21 | 2 |
| Upper Zakum | 2 | 17 | 42 | 5 | 32 | 2 |
| Urals (Russia) | 1 | 12 | 32 | 4 | **49** | 2 |
| ESPO (Russia, Pacific) | 2 | 19 | 44 | 5 | 28 | 2 |
| Bonny Light (Nigeria) | 2 | 24 | 48 | 5 | 19 | 2 |
| Forcados (Nigeria) | 2 | 18 | 46 | 5 | 27 | 2 |
| Tapis (Malaysia) | 3 | 25 | 47 | 5 | 18 | 2 |
| Kimanis (Malaysia/Brunei) | 2 | 22 | 48 | 5 | 21 | 2 |
| Azeri Light/BTC | 2 | 21 | 46 | 5 | 24 | 2 |
| CPC Blend (Kazakh) | 3 | 23 | 45 | 5 | 22 | 2 |
| WTI/Permian | 3 | 26 | 46 | 5 | 18 | 2 |
| Merey (Venezuela) | 1 | 11 | 30 | 4 | **52** | 2 |

[ASSUMPTION — these yields are reasoned defaults based on API gravity and sulphur content; flag in UI. The Russian Urals row matches the documented PRL test cargo result of ~50% FO / 32% HSD.]

**The critical insight this module must surface visually:** if Pakistan substitutes Arab Light with Urals or Merey, **furnace oil output jumps from ~28% to ~50%**, and Pakistan has no FO demand anymore (post-2017 LNG shift). The refinery fills its FO storage in days and has to shut down. The chart should make this brutal: a "feasibility cliff" where certain crude substitutions look cheap but break the refinery system.

**Inputs the analyst can edit:**
- Refinery utilization % (default 90% during crisis, was ~60% normal)
- Crude diet allocation per refinery (sliders summing to 100%)
- Available FO storage in days (defaults to 14 days [ASSUMPTION])
- Toggle: "Refinery shutdown logic enabled" — if FO storage fills, refinery goes offline

**Computed outputs:**
- Total daily output by product (HSD, MS, FO, etc.)
- "Crude diet feasibility score" per refinery (0–100)
- Days-until-FO-storage-full warning per refinery

### Module 4 — Alternate Sourcing & Logistics

**Data structure:** an editable table of alternate sources, each with:
- Country
- Supplier (state company / trading house)
- Product (crude grade or finished product)
- Maximum liftable quantity (barrels/month)
- Normal transit time to Karachi/Port Qasim (days)
- Conflict-rerouted transit time (days)
- Freight rate premium under war-risk (% over normal)
- Payment terms / currency
- Notes

**Default seeded sources (the seven corridors from the ToR):**

| # | Source | Product | Max liftable (kbbl/mo) | Normal transit | Crisis transit | Freight premium | Payment | Notes |
|---|---|---|---|---|---|---|---|---|
| 1a | Russia (ESPO via Pacific, ex-Kozmino) | ESPO crude | 3,000 | 18 days | 18 days | +25% | USD/CNY, deferred | **Unaffected route** — Pacific bypasses ME entirely |
| 1b | Russia (Urals via Baltic/Black Sea, rerouted Cape) | Urals crude | 4,500 | 25 days | 50 days | +120% | USD/CNY | **Refinery feasibility issue — see M3** |
| 2 | Nigeria (NNPC) | Bonny Light, Forcados | 2,500 | 25 days | 32 days | +60% | USD | Via Cape of Good Hope; high MS yield |
| 3 | Angola (Sonangol) | Cabinda, Girassol | 2,000 | 28 days | 35 days | +60% | USD | Via Cape |
| 4 | Kazakhstan (KazMunayGas) | CPC Blend (rail/pipeline swap China) | 800 | 30 days | 30 days | +40% | USD/CNY | Volume-constrained; complex logistics |
| 5 | Malaysia (Petronas) | Tapis, Kimanis | 1,200 | 12 days | 12 days | +15% | USD | **Unaffected route** — Strait of Malacca |
| 6 | Brunei (PetroleumBRUNEI) | Champion, Seria Light | 600 | 14 days | 14 days | +15% | USD | Unaffected |
| 7 | Azerbaijan (SOCAR) | Azeri Light via BTC → Ceyhan → Cape | 1,500 | 20 days | 45 days | +100% | USD | Pipeline to Med, then Cape rerouting |
| 8 | Venezuela (PDVSA) | Merey | 800 [if waiver] | 35 days | 42 days | +70% | CNY/barter | **Sanctions waiver required**; bad refinery fit |
| 9 | Brazil (Petrobras) | Lula, Búzios | 1,500 | 30 days | 38 days | +60% | USD | Via Cape |
| 10 | USA (private) | WTI/Permian | 2,000 [if accessible] | 28 days | 35 days | +50% | USD | Sanctions waiver path; politically sensitive |

[All quantities and transit times marked ASSUMPTION — flag in UI as "indicative — to be confirmed by Working Group with bilateral channels"]

**Computed outputs:**
- Total alternate liftable per month (barrels)
- Total alternate liftable per month at price ceiling X (linked to M6)
- "Time to first cargo arrival" by source (days from contract to ship docked)
- Map visualization showing all source corridors with their transit times

### Module 5 — Iran-Specific Supply Corridors

**Sub-module 5a: Maritime under Chinese Flag**
- Inputs:
  - Daily liftable capacity from Bandar Abbas (default 200,000 bbl/day [ASSUMPTION])
  - Daily liftable capacity from Kharg Island (default 500,000 bbl/day [ASSUMPTION] — assuming infrastructure intact)
  - Number of Chinese-flagged vessels available (default 8 [ASSUMPTION])
  - Average vessel turnaround time Bandar Abbas → Karachi (default 6 days)
  - Discount to Brent (default 25% — sanctions discount)
  - Payment mechanism (default: CNY through central holding entity)
- Output: maximum barrels/month achievable, total monthly cost

**Sub-module 5b: Overland via Taftan / Balochistan**
- Inputs:
  - Pipeline capacity (default 0 — no operational Iran-Pakistan oil pipeline; gas pipeline IP exists but not operational)
  - Trucking capacity (default 5,000 bbl/day [ASSUMPTION])
  - Border crossing degradation factor as conflict intensity rises (slider 0–100%)
  - Security situation modifier (Normal / Tense / Hostile)
- Output: daily throughput in barrels

**Sub-module 5c: Degraded Iranian Production**
- Input: Iranian production capacity as % of pre-conflict (slider with presets at 100%, 75%, 50%, 25%, 0%)
- The four discrete states map to the four ToR scenarios for this module
- Output: cascading effect on 5a and 5b availability

**Visualization:** a single panel showing all three sub-modules feeding into a combined "Iran-Origin Supply" daily throughput number, with a clear note about distribution-via-central-holding due to sanctions.

### Module 6 — Price-Linked Procurement

**Inputs:**
- Pre-crisis Brent baseline (default $71/bbl, 27 Feb 2026)
- Current Brent spot (default $112/bbl [VERIFY at build time])
- Brent multiplier scenarios: 1.0x, 1.5x, 2x, 3x, 4x, 5x — user can select active scenario
- SBP usable reserves (default $16.4B)
- Reserves floor — minimum to maintain (default $10B [ASSUMPTION], roughly 1.5 months of normal imports)
- IMF facility drawdown available (default $1.0B [VERIFY])
- Bilateral credit lines:
  - Saudi Arabia deferred oil facility (default $1.2B/year [ASSUMPTION], with toggle to "double the facility" per recent reports)
  - UAE deposits (default $0 — recently repaid $3B)
  - China deposits/swap line (default $4B [ASSUMPTION])
- Barter capacity (default $500M/year — rice/textiles for oil, primarily Iran)
- Normal monthly oil import bill at baseline (default $1.4B [ASSUMPTION based on 423kbpd × 30 × $71 with finished product premium])

**Computed outputs:**
- **Maximum monthly oil expenditure** = (reserves above floor / months of war) + IMF + bilateral lines + barter, on a per-month basis
- **Affordable barrels at current Brent** = maximum monthly USD / (Brent × 1.10 finished-product premium × 1.X freight premium)
- **Affordability curve:** chart with Brent multiplier on X-axis, affordable barrels on Y-axis, with horizontal lines marking "barrels needed for 100% of normal demand", "barrels needed for Alert level demand", "barrels needed for Austerity demand", "barrels needed for Emergency demand". The intersections are the **price-triggered conservation thresholds**.

### Module 7 — Fuel Conservation Levels

**The proposed conservation matrix with reasoning** (these are the X-values the ToR left blank; user can edit):

| Parameter | Level 1 (Alert) | Level 2 (Austerity) | Level 3 (Emergency) | Reasoning |
|---|---|---|---|---|
| **Trigger thresholds** | Stock < 18 days OR Brent > 1.5× baseline | Stock < 12 days OR Brent > 2.5× baseline | Stock < 7 days OR Brent > 4× baseline | Day thresholds tied to lead time for emergency procurement (~14 days from contract to dock at best). Price thresholds tied to forex sustainability. |
| **Private vehicles** | Odd/even by plate | Weekend driving ban; 20L/week cap per vehicle | Complete ban except medical/emergency/state | Private use is the most discretionary and largest single petrol-consuming sector |
| **Goods transport** | 90% operational | 65% of registered fleet permitted; food/medicine prioritized | 35% of fleet; military, food, medicine, LEA convoy priority | Cannot fully halt: food supply chains, exports, and basic commerce must continue or famine and unrest result within ~10 days |
| **Industry allocation** | 95% normal | 70% of normal | 40% — only essential industries (food processing, pharma, utilities, defence-linked) | Industrial demand is the second-largest diesel sink; staged reduction protects formal employment |
| **Public transport** | Normal operations | Expanded schedules; fare subsidy; 110% of normal capacity | 24/7 operations; mandatory use; no private vehicles permitted | Inversely scales with private vehicle restrictions to absorb displaced demand |
| **Power generation** | Normal grid mix | Shift to coal/hydro/nuclear; gas-fired plants conserved; FO restart contingency | Rolling load-shedding 6 hrs/day urban, 10 hrs/day rural | Gas conservation is critical given Qatar LNG halt; power sector is #2 consumer of imported fuels |
| **Lockdown days** | None | 1 day/week (Sunday) | 2 days/week (Sat-Sun) | Reduces all sectoral demand simultaneously; politically costly so reserved for higher levels |
| **Agriculture** | Full diesel allocation | 80% allocation; priority for harvest windows | 60% allocation; state-coordinated harvest convoys | Cannot drop below survival threshold: a missed wheat or cotton harvest is a multi-year economic catastrophe. April–May is wheat harvest in Punjab; this matters NOW. |
| **Aviation** | Normal | Domestic flights cut 40%; international routes prioritized | Domestic flights cut 80%; only essential international | JP-1 is a smaller share but politically and economically high-visibility |
| **CNG** | Normal | Expanded CNG promotion | Mandatory CNG conversion subsidies for taxis/rickshaws | Pakistan has CNG infrastructure that can absorb some petrol demand if domestic gas allocation permits |

**Computed demand reductions** (these flow back to M1 to update depletion curves):

| Level | HSD reduction | MS reduction | FO reduction | JP-1 reduction |
|---|---|---|---|---|
| None | 0% | 0% | 0% | 0% |
| Alert | 8% | 12% | 5% | 5% |
| Austerity | 22% | 35% | 15% | 30% |
| Emergency | 40% | 60% | 25% | 60% |

These percentages are derived from the matrix above (e.g., MS reduction is dominated by private vehicle restrictions; HSD by goods transport + industry; FO by power generation). The app should compute these from the policy parameters, not hardcode them, so editing the matrix automatically updates the depletion curves in M1.

### Module 8 — Dynamic Trigger Logic

**The composite trigger function** evaluates five inputs and produces a recommended level:

```
INPUTS:
  D = days_of_fuel_cover (weighted: 0.5*HSD + 0.35*MS + 0.15*FO)
  P = brent_price / brent_baseline
  S = pipeline_status_score (0-100, computed from M2 risk-weighted arrivals)
  A = alternate_activation_score (0-100, contracts placed and vessels en route from M4)
  I = iran_corridor_score (0-100, computed from M5: 100=fully open, 0=closed)

WEIGHTS (default, editable):
  w_D = 0.40   (days of cover)
  w_P = 0.25   (price stress)
  w_S = 0.15   (pipeline reliability — note: weight is on DEFICIT, so low S raises level)
  w_A = 0.10   (alternates active — buffer)
  w_I = 0.10   (Iran corridor — buffer)

NORMALIZED STRESS SCORE (0-100, higher = worse):
  stress_D = max(0, min(100, 100 * (30 - D) / 30))         # 30 days = no stress, 0 days = max
  stress_P = max(0, min(100, 100 * (P - 1) / 4))           # baseline = 0, 5x = max
  stress_S = 100 - S                                        # invert
  buffer_A = A
  buffer_I = I

  composite_stress = (w_D * stress_D) + (w_P * stress_P) + (w_S * stress_S)
                     - (w_A * buffer_A * 0.5) - (w_I * buffer_I * 0.5)

LEVEL THRESHOLDS:
  composite_stress < 25         → NORMAL
  25 ≤ composite_stress < 50    → ALERT (Level 1)
  50 ≤ composite_stress < 75    → AUSTERITY (Level 2)
  composite_stress ≥ 75         → EMERGENCY (Level 3)
```

**Plus hard overrides (any one triggers immediately):**
- D < 7 days for any of HSD, MS → EMERGENCY
- D < 14 days AND no cargoes arriving in next 7 days → EMERGENCY
- P > 4× baseline AND reserves < $12B → AUSTERITY minimum
- All Iran corridor closed AND total alternate activation < 30% → AUSTERITY minimum

**De-escalation rule** (per ToR):
- Recommended level can only step down by one level per evaluation
- All composite_stress conditions must be met for **7 consecutive days** before de-escalation is permitted
- Manual override available to the National Energy Security Committee (toggle in UI)

**Visualization:** a "stress dial" (semi-circle gauge) showing composite stress 0–100 with the four bands color-coded. Below it, a breakdown bar chart showing the five component contributions to the current score. To the right, a 30-day projected stress trajectory line chart given current scenario inputs.

---

## 5. Excel export specification

The exported `.xlsx` file must satisfy the ToR's "integrated crisis simulation model" deliverable. Structure:

| Sheet | Purpose |
|---|---|
| `00_Cover` | Title, classification, scenario name, date, version |
| `01_Executive_Summary` | One-page summary of key outputs and recommended trigger level |
| `02_Inputs_Master` | All editable inputs from all modules in a single editable sheet, with named ranges |
| `03_M1_Inventory` | Module 1 inputs, computed outputs, depletion curves table |
| `04_M2_Pipeline` | Module 2 cargo table with formulas computing risk-weighted arrivals |
| `05_M3_Refining` | Module 3 yield matrix and computed product output |
| `06_M4_Alternates` | Module 4 source table with affordability columns linked to M6 |
| `07_M5_Iran` | Module 5 sub-modules with combined throughput |
| `08_M6_Price` | Module 6 affordability curve calculations |
| `09_M7_Conservation` | Module 7 matrix with computed demand reductions |
| `10_M8_Trigger` | Module 8 composite calculation with all weights and thresholds |
| `11_Scenarios_Compare` | Side-by-side comparison of all four ToR scenarios |
| `12_Assumptions_Log` | Every [ASSUMPTION] flagged value with source and reasoning |
| `13_Methodology` | Plain-English methodology notes for the Committee |

**Critical:** the cells must contain **live Excel formulas**, not pasted values, so a Working Group analyst can open the file and continue iterating without the app. SheetJS (xlsx) supports formulas via `cell.f`. Use named ranges across sheets for cross-sheet references.

The cover sheet should have the same classification banner ("CONFIDENTIAL — National Energy Security Working Group") at the top.

---

## 6. The four ToR scenarios — preconfigured presets

Each preset is a JSON object that overrides specific inputs from the defaults.

### Scenario A: Partial Hormuz Closure
- Module 2 baseline mode: "Iran-Permitted Transit"
- Pipeline status: 50% of normal throughput
- Brent: 1.5× baseline ($107)
- Iran corridor: degraded (50%)
- Expected outcome: ALERT level recommended

### Scenario B: Complete Hormuz Closure (ToR baseline)
- Module 2 baseline mode: "Full Corridor Compromised"
- All war-zone cargoes ≥40% loss probability
- Brent: 2× baseline ($142)
- Iran corridor: closed (Module 5 maritime = 0)
- Iranian production: 75%
- Expected outcome: AUSTERITY level recommended

### Scenario C: Wider Gulf Conflict + Energy Infrastructure Damage
- Same as B, plus:
- Iranian production: 25%
- Saudi/UAE alternate liftable reduced 50%
- Brent: 3× baseline ($213)
- Insurance freight premium: +200%
- Expected outcome: EMERGENCY level recommended

### Scenario D: Combined Supply-and-Price Shock
- Same as C, plus:
- Brent: 4× baseline ($284)
- SBP reserves drained to $12B
- IMF emergency facility unavailable
- Expected outcome: EMERGENCY with hard override; recommendation explicitly notes "Pakistan cannot afford normal demand at any conservation level below Emergency"

These presets must be loadable from the Scenario Manager with one click.

---

## 7. Agent swarm work plan (parallel tracks)

Recommended parallelization for Claude Code. The dependencies are loose enough that 5–6 agents can work in parallel after a 30-minute scaffold phase.

### Phase 0 — Scaffold (1 agent, ~30 min)
- Initialize Next.js 14 + TypeScript + Tailwind + shadcn/ui
- Set up Zustand store with the full scenario state shape
- Create the layout shell (header, left nav, main panel, status bar)
- Set up routing for /dashboard, /modules/m1 through /modules/m8, /scenarios, /report
- Install and configure: recharts, xlsx (SheetJS), framer-motion, lucide-react
- Set up the editorial-minimalist theme (off-white bg, navy/red/ochre accents, IBM Plex Sans + Mono)
- Commit a working "hello world" that renders the empty shell

### Phase 1 — Parallel module build (5 agents in parallel, ~2 hours)

**Agent A: Modules 1 & 2 (Inventory + Pipeline)**
- Build M1 panel with all inputs, computed outputs, depletion curves chart
- Build M2 panel with cargo table, status filters, risk-weighted arrival chart
- Implement the depletion math
- Seed the 8 illustrative cargo records

**Agent B: Modules 3 & 4 (Refining + Alternates)**
- Build M3 panel with refinery cards, crude diet sliders, yield matrix
- Build the "feasibility cliff" visualization
- Build M4 panel with alternate source table, map visualization, time-to-first-cargo logic
- Use Leaflet or react-simple-maps for the corridor map (offline tiles or SVG world map)

**Agent C: Modules 5 & 6 (Iran + Price)**
- Build M5 with three sub-modules and combined throughput display
- Build M6 with the affordability curve chart and forex constraint logic
- This agent handles the most politically sensitive module — copy must be neutral and analytical

**Agent D: Modules 7 & 8 (Conservation + Trigger)**
- Build the M7 conservation matrix as an editable grid
- Implement the demand reduction derivation logic
- Build M8 with the stress dial, component breakdown, and 30-day projection
- Implement the hard overrides and de-escalation logic
- Wire the trigger output back to the dashboard recommendation banner

**Agent E: Dashboard, Scenarios, Report, Excel Export**
- Build the dashboard with six vital-sign cards and depletion curve overlay
- Build the Scenario Manager with save/load JSON and the four presets
- Build the Report panel with print-clean styling
- Build the Excel export using SheetJS, with all sheets and live formulas
- This agent must coordinate with A–D to know the final shape of all module data

### Phase 2 — Integration & polish (1 coordinating agent, ~1 hour)
- Wire all modules through the Zustand store so changes propagate
- Verify that editing M7 updates the depletion curves in M1 and the trigger in M8
- Verify that the four preset scenarios load correctly and produce the expected recommended levels
- Test the Excel export against each scenario
- Run a clean build and fix any TypeScript errors
- Add the assumptions log view that lists every [ASSUMPTION] flagged input

### Phase 3 — Research validation (1 research agent, runs in parallel with Phase 1)
This agent's job is to **re-verify** every [VERIFY] tag in this brief against the latest sources before the build is finalized. Specifically:
- Current Brent spot price (Bloomberg, Reuters, ICE)
- Latest SBP reserves figure (sbp.org.pk)
- Current IMF program disbursement schedule
- Latest Pakistan Senate/Finance Committee briefing on stocks
- Pakistan refinery Nelson Complexity Index actual values (try OGRA annual reports, refinery investor presentations)
- Trailing 30-day consumption figures from OCAC if accessible
- Any updates to Iran's permitted-transit list

The research agent updates the defaults in the codebase and the assumptions log before final commit.

---

## 8. Quality bar

The app is "done" when:

1. All eight modules are functional and interlinked — editing an input in M3 immediately updates the depletion curve in M1 and the trigger level in M8.
2. The four ToR scenarios load as one-click presets and each produces a recommended trigger level consistent with its severity.
3. The Excel export contains live formulas (not pasted values) and all 13+ sheets.
4. Every [ASSUMPTION] flagged number has a tooltip showing its reasoning and the source agent for the figure.
5. The Report panel is print-clean and looks like a government document.
6. No console errors. TypeScript strict mode passes. Production build succeeds.
7. The "Iran-Permitted Transit" baseline mode toggle works and visibly changes pipeline risk weighting.
8. The stress dial in M8 animates smoothly and the component breakdown is legible.
9. Loading the app cold and clicking through the four preset scenarios takes under 90 seconds end-to-end.
10. A senior Working Group analyst, opening this for the first time, can run a custom scenario without instructions.

---

## 9. Things the swarm should NOT do

- **Do not** add authentication, user accounts, or backend persistence.
- **Do not** add real-time data feeds or external API calls in v1 — every value is editable defaulted, not fetched.
- **Do not** add LLM features, AI explanations, or chat interfaces. This is a model, not a chatbot.
- **Do not** soften the Iran corridor module with disclaimers or warnings. It is treated as analytically necessary, with neutral framing.
- **Do not** invent real PSO contract data or attribute fictional cargoes to real vessels. Use plausible but clearly illustrative seed records.
- **Do not** use stock illustrations, gradients, or "AI-generated" looking design elements. Editorial minimalism only.
- **Do not** add emojis anywhere in the UI. This is a confidential government working document.
- **Do not** rebuild the conservation matrix from scratch — use the proposed defaults in Section 4 (M7) and surface them as editable.
- **Do not** ask the user clarifying questions during the build. Make a reasoned default, flag it, and move on.

---

## 10. Open items the swarm may flag in a final notes file

The build proceeds without these blocking, but the swarm should document anything it considered uncertain and surface a `OPEN_ITEMS.md` at the end of the build for human review:

- Actual PSO commercial stock by terminal (currently using Senate briefing aggregate)
- Actual refinery Nelson Complexity Index values (currently estimated)
- Actual yield profiles by refinery × crude grade (currently using public hydroskimming averages)
- Actual freight rate premium curves under war-risk (currently using a flat percentage)
- Actual Iranian Bandar Abbas / Kharg Island throughput capacity for foreign vessels
- Actual bilateral credit line balances (Saudi, China, UAE)
- Pre-existing Pakistan Strategic Petroleum Reserves (none formally established as of last public reporting)
- Trailing 30-day consumption breakdown — public sources lag and are aggregated

These are all numbers that the Working Group itself would supply when the model goes operational. The app's job is to be ready for them.

---

## 11. File deliverables expected from the swarm

At the end of the build, the working directory should contain:

```
pakistan-energy-crisis-app/
├── README.md                    # How to run, deploy, and use
├── BRIEF.md                     # This document, copied for reference
├── OPEN_ITEMS.md                # Items flagged for human review
├── ASSUMPTIONS_LOG.md           # Every flagged assumption with source
├── package.json
├── next.config.js (or vite.config.ts)
├── tsconfig.json
├── tailwind.config.ts
├── src/
│   ├── app/ (or pages/)
│   ├── components/
│   │   ├── shell/
│   │   ├── modules/
│   │   ├── dashboard/
│   │   ├── scenarios/
│   │   └── report/
│   ├── lib/
│   │   ├── store.ts             # Zustand state
│   │   ├── calculations/        # Pure functions for each module
│   │   ├── presets.ts           # Four ToR scenario presets
│   │   ├── defaults.ts          # All baseline values from this brief
│   │   └── excel-export.ts      # SheetJS export logic
│   ├── types/
│   └── styles/
└── public/
```

A working `npm run dev` produces the app at `localhost:3000`. A `npm run build` produces a static export ready for any host.

---

## 12. Final note from Rahim to the swarm

This is real. The Working Group is convening. Pakistan's days-of-cover at the start of this crisis was 11 days of crude. The window for analysis is small and the cost of being wrong is measured in food prices, hospital generators, and harvests. Build it like that matters — because it does.

— End of brief —

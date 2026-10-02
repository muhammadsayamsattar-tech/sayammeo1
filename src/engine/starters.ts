import { EMPTY_INTAKE, type TaskIntake } from "./types";

export interface Starter {
  id: string;
  label: string;
  scaleHint: string;
  intake: TaskIntake;
}

export const STARTERS: Starter[] = [
  {
    id: "refund",
    label: "Customer reply",
    scaleHint: "Small",
    intake: {
      ...EMPTY_INTAKE,
      function: "customer",
      request:
        "Write a reply to a customer who was charged twice for the annual plan. Apologize, confirm the refund timeline, and say what we changed so it does not happen again. Keep it under 120 words.",
      audience: "A finance manager at a mid-size customer",
      outputHint: "A short email with a subject line.",
      constraints:
        "Under 120 words. No slang. No admission of legal fault beyond the duplicate charge. Do not blame the customer or the billing vendor.",
    },
  },
  {
    id: "follow-up",
    label: "Meeting follow-up",
    scaleHint: "Small",
    intake: {
      ...EMPTY_INTAKE,
      function: "operations",
      request:
        "Write the follow-up after Monday's staff meeting. Record the five decisions, the owner of each, and the date. Keep it under 150 words.",
      audience: "The staff who were in the room",
      outputHint: "A short email with a subject line and a five-row list.",
      constraints: "Under 150 words. Decisions only. Leave discussion and parking-lot items out.",
      sources: "Meeting notes pasted by the user.",
    },
  },
  {
    id: "vendor",
    label: "Vendor memo",
    scaleHint: "Medium",
    intake: {
      ...EMPTY_INTAKE,
      function: "operations",
      request:
        "Draft a one-page decision memo comparing two support-desk vendors. Recommend one for the COO, with the cost, the rollout effort, and the risk of switching.",
      audience: "COO",
      outputHint: "A one-page memo: recommendation, comparison table, and the decision needed.",
      success: "The COO can approve a vendor in the meeting without asking for another analysis.",
      constraints: "One page. No vendor slogans. Separate contract facts from our estimates.",
      sources: "Vendor quotes and the last two quarters of ticket volume, supplied by the user.",
    },
  },
  {
    id: "sop",
    label: "Sales SOP",
    scaleHint: "Medium",
    intake: {
      ...EMPTY_INTAKE,
      function: "sales",
      request:
        "Draft a one-page SOP for how a new account executive qualifies an inbound lead before booking a founder on the call.",
      audience: "New account executives and the sales manager who will coach them",
      outputHint: "A one-page SOP with steps, a qualify / disqualify checklist, and one exception path.",
      success: "A new hire can run the next inbound lead without asking what 'qualified' means.",
      constraints: "One page. Plain language. No commission math.",
      nonGoals: "Do not redesign pricing or the CRM.",
    },
  },
  {
    id: "operating-plan",
    label: "Operating plan",
    scaleHint: "Large",
    intake: {
      ...EMPTY_INTAKE,
      function: "strategy",
      request:
        "Build a two-quarter operating plan to move the company from founder-led sales to a repeatable sales organization. Include stakeholders, governance, workstreams, risks, and a board-ready recommendation.",
      audience: "CEO and the board",
      owner: "CEO",
      stakeholders: "Founder, first sales hire, customer lead, finance partner, board chair",
      outputHint:
        "A board paper: decision note, workstream plan for two quarters, risks, and the ask of the board.",
      success:
        "The board can approve the plan, the hire, and the governance cadence, or send it back with a specific objection.",
      constraints: "Two quarters. No multi-year transformation story. Headcount changes need a cost line.",
      nonGoals: "Rebrand, new product lines, and international expansion.",
      deadline: "Board meeting in four weeks",
      sources: "Current pipeline, win rates, and founder time spent on sales, supplied by the user.",
    },
  },
  {
    id: "market-entry",
    label: "Market entry",
    scaleHint: "Large",
    intake: {
      ...EMPTY_INTAKE,
      function: "marketing",
      request:
        "Prepare a market-entry brief for selling our existing product to clinic groups. Cover the buyer, the offer, the first-year motion, the risks, and a go-to-market recommendation the leadership team can fund or stop.",
      audience: "Leadership team",
      owner: "CEO",
      stakeholders: "Marketing, sales, product, clinical advisor, finance",
      outputHint: "A decision brief with a recommendation, two alternatives, a first-year motion, and an explicit stop condition.",
      success: "Leadership funds a bounded first motion or kills the idea against a written stop condition.",
      constraints: "Use only sources we provide. No invented market sizes. First motion must be reversible within a quarter.",
      nonGoals: "Building a new product, hiring a full field team, and regulatory strategy beyond a flagged question.",
      deadline: "Decision in three weeks",
    },
  },
];

export const SAMPLE_INTAKE: TaskIntake = STARTERS[0].intake;

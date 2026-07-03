import type { AiMessage, AiPromptSuggestion, AiWidget } from "@/types/ai";

const PROMPTS: AiPromptSuggestion[] = [
  {
    id: "risky-deals",
    label: "Show my risky deals",
    prompt: "Show my risky deals",
    icon: "alert",
    gradient: "from-rose-500/20 to-orange-500/20",
  },
  {
    id: "daily-summary",
    label: "Generate today's summary",
    prompt: "Generate today's summary",
    icon: "sun",
    gradient: "from-amber-500/20 to-yellow-500/20",
  },
  {
    id: "revenue-forecast",
    label: "Forecast next month's revenue",
    prompt: "Forecast next month's revenue",
    icon: "trending",
    gradient: "from-violet-500/20 to-indigo-500/20",
  },
  {
    id: "proposal",
    label: "Create proposal",
    prompt: "Create a proposal for our top open deal",
    icon: "file",
    gradient: "from-sky-500/20 to-cyan-500/20",
  },
  {
    id: "meetings",
    label: "Summarize meetings",
    prompt: "Summarize this week's meetings",
    icon: "calendar",
    gradient: "from-purple-500/20 to-fuchsia-500/20",
  },
  {
    id: "follow-up",
    label: "Generate follow-up email",
    prompt: "Generate a follow-up email for inactive leads",
    icon: "mail",
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
  {
    id: "inactive",
    label: "Show inactive customers",
    prompt: "Show inactive customers from the last 90 days",
    icon: "users",
    gradient: "from-slate-500/20 to-zinc-500/20",
  },
  {
    id: "top-sales",
    label: "Top performing salespeople",
    prompt: "Who are the top performing salespeople this quarter?",
    icon: "trophy",
    gradient: "from-indigo-500/20 to-violet-500/20",
  },
];

function matchResponse(prompt: string): { content: string; widgets: AiWidget[] } {
  const lower = prompt.toLowerCase();

  if (lower.includes("risky") || lower.includes("risk")) {
    return {
      content:
        "I found **3 deals** that may need attention based on stage duration, probability drop, and missing activity.\n\nHere's a breakdown of at-risk opportunities in your pipeline:",
      widgets: [
        {
          type: "risk",
          title: "At-risk deals",
          level: "high",
          deals: [
            { name: "Acme Enterprise License", value: "$124,000", probability: 32 },
            { name: "Globex Renewal", value: "$58,500", probability: 41 },
            { name: "Initech Pilot", value: "$22,000", probability: 28 },
          ],
        },
        {
          type: "kpi",
          label: "Pipeline at risk",
          value: "$204.5K",
          change: "+12% vs last week",
          trend: "down",
        },
        {
          type: "insight",
          title: "Recommended action",
          body: "Schedule executive check-ins for Acme and Initech within 48 hours. Globex has no activity in 14 days.",
          severity: "warning",
        },
      ],
    };
  }

  if (lower.includes("forecast") || lower.includes("revenue")) {
    return {
      content:
        "Based on your current pipeline velocity and historical win rates, here's the **revenue forecast** for the next quarter:",
      widgets: [
        {
          type: "forecast",
          title: "Revenue forecast",
          period: "Next 90 days",
          predicted: "$428,000",
          confidence: 78,
          data: [
            { month: "Jul", value: 118000 },
            { month: "Aug", value: 142000 },
            { month: "Sep", value: 168000 },
          ],
        },
        {
          type: "chart",
          title: "Pipeline forecast",
          chartType: "area",
          data: [
            { label: "Won", value: 89000 },
            { label: "Commit", value: 156000 },
            { label: "Best case", value: 183000 },
          ],
        },
      ],
    };
  }

  if (lower.includes("summary") || lower.includes("today")) {
    return {
      content: "Here's your **daily executive summary** for today:",
      widgets: [
        { type: "kpi", label: "Meetings today", value: "4", change: "2 with key accounts", trend: "neutral" },
        { type: "kpi", label: "Open tasks", value: "12", change: "3 overdue", trend: "down" },
        { type: "kpi", label: "New leads", value: "7", change: "+3 vs yesterday", trend: "up" },
        {
          type: "timeline",
          title: "Today's schedule",
          items: [
            { time: "10:00 AM", title: "Acme QBR", detail: "Zoom · Sarah Chen" },
            { time: "1:30 PM", title: "Pipeline review", detail: "Internal" },
            { time: "4:00 PM", title: "Globex demo", detail: "Teams · 5 attendees" },
          ],
        },
        {
          type: "insight",
          title: "Priority focus",
          body: "Close follow-ups on 2 stalled deals and confirm Globex technical requirements before the demo.",
          severity: "info",
        },
      ],
    };
  }

  if (lower.includes("meeting")) {
    return {
      content: "I summarized **6 meetings** from this week. Key themes: pricing objections, integration timeline, and renewal discussions.",
      widgets: [
        {
          type: "table",
          title: "Meeting highlights",
          columns: ["Account", "Topic", "Outcome"],
          rows: [
            ["Acme Corp", "Enterprise pricing", "Needs CFO approval"],
            ["Globex", "Product demo", "Positive — next step scheduled"],
            ["Initech", "Support SLA", "At risk — escalate"],
          ],
        },
      ],
    };
  }

  if (lower.includes("inactive") || lower.includes("customer")) {
    return {
      content: "Found **8 accounts** with no meaningful activity in the last 90 days:",
      widgets: [
        {
          type: "table",
          title: "Inactive customers",
          columns: ["Company", "Last activity", "ARR"],
          rows: [
            ["Northwind Traders", "94 days ago", "$18,400"],
            ["Contoso Ltd", "102 days ago", "$42,000"],
            ["Fabrikam Inc", "88 days ago", "$9,200"],
          ],
        },
        {
          type: "insight",
          title: "Re-engagement tip",
          body: "Contoso has the highest ARR at risk. A personalized executive outreach email could recover this account.",
          severity: "warning",
        },
      ],
    };
  }

  if (lower.includes("top") || lower.includes("salespeople") || lower.includes("performing")) {
    return {
      content: "Here are your **top performers** this quarter based on closed-won revenue and activity score:",
      widgets: [
        {
          type: "table",
          title: "Sales leaderboard",
          columns: ["Rep", "Closed won", "Win rate", "Activities"],
          rows: [
            ["Sarah Chen", "$186,400", "34%", "128"],
            ["James Wilson", "$142,800", "29%", "96"],
            ["Priya Patel", "$118,200", "31%", "112"],
          ],
        },
        {
          type: "chart",
          title: "Revenue by rep",
          chartType: "bar",
          data: [
            { label: "Sarah", value: 186 },
            { label: "James", value: 143 },
            { label: "Priya", value: 118 },
          ],
        },
      ],
    };
  }

  if (lower.includes("email") || lower.includes("follow-up")) {
    return {
      content:
        "Here's a **follow-up email draft** you can send to inactive leads:\n\n---\n\n**Subject:** Quick check-in from Nexora\n\nHi {{first_name}},\n\nI wanted to reach out since we last spoke about improving your sales workflow. We've helped similar teams shorten deal cycles by 22%.\n\nWould a 15-minute call this week work to explore if Nexora is still a fit?\n\nBest,\n{{your_name}}\n\n---\n\n*Personalize merge fields before sending.*",
      widgets: [
        {
          type: "insight",
          title: "Send timing",
          body: "Tuesday 9–11 AM in the recipient's timezone typically gets the highest reply rate for B2B follow-ups.",
          severity: "success",
        },
      ],
    };
  }

  if (lower.includes("proposal")) {
    return {
      content:
        "I've outlined a **proposal structure** for your top open deal (Acme Enterprise License). Review the sections below and I can expand any section.",
      widgets: [
        {
          type: "insight",
          title: "Executive summary",
          body: "Nexora CRM will unify Acme's sales, pipeline, and customer communications with enterprise-grade security and AI-assisted workflows.",
          severity: "info",
        },
        {
          type: "kpi",
          label: "Proposed value",
          value: "$124,000",
          change: "Annual · 50 seats",
          trend: "neutral",
        },
      ],
    };
  }

  if (lower.includes("deal") && lower.includes("50")) {
    return {
      content: "Found **4 deals** above $50,000 in your pipeline:",
      widgets: [
        {
          type: "table",
          title: "High-value deals",
          columns: ["Deal", "Stage", "Value", "Probability"],
          rows: [
            ["Acme Enterprise", "Negotiation", "$124,000", "68%"],
            ["Globex Renewal", "Proposal", "$58,500", "55%"],
            ["Umbrella Corp", "Discovery", "$72,000", "40%"],
          ],
        },
      ],
    };
  }

  if (lower.includes("report") || lower.includes("performance")) {
    return {
      content: "Here's your **sales performance report** for this month:",
      widgets: [
        {
          type: "table",
          title: "Monthly performance",
          columns: ["Metric", "Value", "Change"],
          rows: [
            ["Revenue closed", "$186,400", "+12%"],
            ["Deals won", "14", "+2"],
            ["Win rate", "29%", "+3%"],
            ["Avg deal size", "$13,314", "+5%"],
          ],
        },
        {
          type: "chart",
          title: "Revenue trend",
          chartType: "bar",
          data: [
            { label: "Week 1", value: 42 },
            { label: "Week 2", value: 48 },
            { label: "Week 3", value: 51 },
            { label: "Week 4", value: 45 },
          ],
        },
      ],
    };
  }

  if (lower.includes("insight") || lower.includes("business")) {
    return {
      content: "Here are today's **business insights** across your CRM:",
      widgets: [
        { type: "kpi", label: "Pipeline value", value: "$1.2M", change: "+8%", trend: "up" },
        { type: "kpi", label: "Conversion rate", value: "24%", change: "-2%", trend: "down" },
        {
          type: "insight",
          title: "Key insight",
          body: "Deal velocity slowed 15% — focus on negotiation-stage follow-ups this week.",
          severity: "warning",
        },
        {
          type: "insight",
          title: "Opportunity",
          body: "3 warm leads from last week's webinar haven't been contacted yet.",
          severity: "success",
        },
      ],
    };
  }

  if (lower.includes("recommendation")) {
    return {
      content: "Based on your CRM activity, here are my **top recommendations**:",
      widgets: [
        {
          type: "insight",
          title: "1. Prioritize Acme Enterprise",
          body: "Highest value deal in negotiation — schedule executive alignment call.",
          severity: "info",
        },
        {
          type: "insight",
          title: "2. Re-engage Contoso",
          body: "No activity in 94 days · $42K ARR at risk.",
          severity: "warning",
        },
        {
          type: "insight",
          title: "3. Clear overdue tasks",
          body: "3 tasks overdue may be blocking deal progression.",
          severity: "warning",
        },
      ],
    };
  }

  return {
    content:
      "I can help you analyze deals, forecast revenue, summarize meetings, draft emails, and search your CRM data.\n\nTry asking about **risky deals**, **today's summary**, or **revenue forecast** — or pick a suggestion card below.",
    widgets: [
      {
        type: "insight",
        title: "Nexora AI",
        body: "Connected to your CRM data. Responses are simulated in this preview — backend integration coming soon.",
        severity: "info",
      },
    ],
  };
}

export function getPromptSuggestions(): AiPromptSuggestion[] {
  return PROMPTS;
}

export function buildAssistantMessage(
  prompt: string,
  content: string,
  id?: string,
): AiMessage {
  const { widgets } = matchResponse(prompt);
  return {
    id: id ?? crypto.randomUUID(),
    role: "assistant",
    content,
    widgets,
    createdAt: new Date().toISOString(),
    liked: null,
    pinned: false,
    streaming: false,
  };
}

export async function* streamMockResponse(
  prompt: string,
  onChunk?: (text: string) => void,
): AsyncGenerator<string, void, void> {
  const { content } = matchResponse(prompt);
  const words = content.split(/(\s+)/);
  let accumulated = "";

  for (const word of words) {
    accumulated += word;
    onChunk?.(accumulated);
    await new Promise((r) => setTimeout(r, 12 + Math.random() * 18));
    yield accumulated;
  }
}

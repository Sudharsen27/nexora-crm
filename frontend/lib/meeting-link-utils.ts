/** Helpers for meeting video / calendar links. */

export type MeetingLinkProvider = "jitsi" | "google_meet" | "zoom" | "teams" | "custom";

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "meeting";
}

/** Free instant video room — no API key required. */
export function generateJitsiMeetingLink(title: string, tenantSlug: string): string {
  const slug = slugifyTitle(title);
  const unique = crypto.randomUUID().slice(0, 8);
  return `https://meet.jit.si/nexora-${tenantSlug}-${slug}-${unique}`;
}

export function detectMeetingLinkProvider(url: string): MeetingLinkProvider {
  const lower = url.toLowerCase();
  if (lower.includes("meet.google.com")) return "google_meet";
  if (lower.includes("zoom.us")) return "zoom";
  if (lower.includes("teams.microsoft.com") || lower.includes("teams.live.com")) return "teams";
  if (lower.includes("meet.jit.si")) return "jitsi";
  return "custom";
}

export function meetingLinkProviderLabel(provider: MeetingLinkProvider): string {
  const labels: Record<MeetingLinkProvider, string> = {
    jitsi: "Nexora Video Room",
    google_meet: "Google Meet",
    zoom: "Zoom",
    teams: "Microsoft Teams",
    custom: "Video link",
  };
  return labels[provider];
}

export async function copyMeetingLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/** Build a shareable calendar page link for this meeting. */
export function buildMeetingShareLink(tenantSlug: string, meetingId: string, baseUrl?: string): string {
  const origin = baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}/${tenantSlug}/calendar?meeting=${meetingId}`;
}

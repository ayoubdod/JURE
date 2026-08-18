import { API_BASE } from "@/config/api";
import { ORG } from "@/marketing/site";

export const CONTACT_INBOX = ORG.email;

export type LandingInquiry = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  source?: string;
  message: string;
};

export async function submitLandingInquiry(payload: LandingInquiry): Promise<void> {
  const response = await fetch(`${API_BASE}/commons/contacts/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Language":
        typeof document !== "undefined" ? document.documentElement.lang || "en" : "en",
    },
    body: JSON.stringify({
      name: payload.name.trim(),
      email: payload.email.trim(),
      phone: payload.phone?.trim() || undefined,
      company: payload.company?.trim() || "",
      subject: payload.subject?.trim() || "",
      source: payload.source?.trim() || "contact",
      message: payload.message.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Landing inquiry failed (${response.status})`);
  }
}

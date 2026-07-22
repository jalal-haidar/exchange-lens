import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@/lib/errors";

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildInvitationUrl(token) {
  const baseUrl = process.env.NEXT_PUBLIC_EXCHANGE_URL || "http://localhost:3005";
  const url = new URL("/invite/accept", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendOrganizationInvitation({
  email,
  organizationName,
  role,
  invitationUrl,
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      return { delivered: false, previewUrl: invitationUrl };
    }
    throw new AppError(
      "Invitation email delivery is not configured",
      503,
      "EXT_INVITATION_EMAIL_NOT_CONFIGURED",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Join ${organizationName} in Exchange Lens`,
      html: `
        <h1>Exchange Lens invitation</h1>
        <p>You were invited to join <strong>${escapeHtml(organizationName)}</strong> as ${escapeHtml(role)}.</p>
        <p><a href="${escapeHtml(invitationUrl)}">Accept invitation</a></p>
        <p>This one-time invitation expires in seven days. Sign in with the invited LifeLens email address.</p>
      `,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new AppError("Failed to deliver invitation email", 502, "EXT_INVITATION_EMAIL_FAILED");
  }

  return { delivered: true, previewUrl: null };
}

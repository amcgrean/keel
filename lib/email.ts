/**
 * Best-effort transactional email via Resend's REST API.
 *
 * Notifications are opt-in through env: with no RESEND_API_KEY set, this is a
 * no-op, so the app works identically with or without email configured. A send
 * failure is swallowed — a notification must never break the user's action.
 *
 * To enable: set RESEND_API_KEY (and optionally KEEL_EMAIL_FROM) in Vercel.
 * The default From uses Resend's onboarding sender, which only delivers to the
 * account owner's address until you verify a domain.
 */
export async function sendEmail(
  to: string | null | undefined,
  subject: string,
  text: string
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;

  const from = process.env.KEEL_EMAIL_FROM || "Keel <onboarding@resend.dev>";

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
  } catch {
    // Intentionally ignored — notifications are best-effort.
  }
}

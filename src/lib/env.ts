/**
 * Vercel injects the project's environment variables into `process.env` at
 * runtime. `astro dev`, however, only exposes a local .env through
 * `import.meta.env` — and Vite replaces those references statically, so they
 * have to be listed one by one rather than looked up dynamically.
 *
 * Reading through here means the same code works in both places.
 */
const fromDotEnv: Record<string, string | undefined> = {
  SMTP_HOST: import.meta.env.SMTP_HOST,
  SMTP_PORT: import.meta.env.SMTP_PORT,
  SMTP_USER: import.meta.env.SMTP_USER,
  SMTP_PASS: import.meta.env.SMTP_PASS,
  ADMIN_EMAILS: import.meta.env.ADMIN_EMAILS,
  BOOKING_SECRET: import.meta.env.BOOKING_SECRET,
  PUBLIC_SITE_URL: import.meta.env.PUBLIC_SITE_URL,
  REVOLUT_CHECKOUT_URL: import.meta.env.REVOLUT_CHECKOUT_URL,
  TICKET_ON_BOOKING: import.meta.env.TICKET_ON_BOOKING,
};

export function env(name: keyof typeof fromDotEnv, fallback = ""): string {
  return process.env[name] ?? fromDotEnv[name] ?? fallback;
}

import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  const parsedPort = Number(port);
  if (!Number.isFinite(parsedPort)) {
    return null;
  }

  return {
    host,
    port: parsedPort,
    secure: parsedPort === 465,
    auth: { user, pass },
    from,
  };
}

/**
 * Sends a password reset email using SMTP credentials configured through environment variables.
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) {
  const config = getSmtpConfig();

  if (!config) {
    throw new Error("SMTP is not configured");
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  await transport.sendMail({
    from: config.from,
    to,
    subject: "FriendSync password reset",
    text: `You requested a password reset for FriendSync.\n\nUse this link to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    html: `<p>You requested a password reset for FriendSync.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
  });
}

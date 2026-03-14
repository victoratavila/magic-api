import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envia email de reset de senha
 */
export async function sendResetPasswordEmail(to: string, resetLink: string) {
  await resend.emails
    .send({
      from: "MagicManager <magic-api@domainfortraining.xyz>",
      to,
      subject: "Reset your password",
      html: `
      <h2>Password Reset</h2>

      <p>You requested a password reset.</p>

      <p>Click the link below to create a new password:</p>

      <a href="${resetLink}">
        Reset Password
      </a>

      <p>This link expires in 15 minutes.</p>

      <p>If you didn't request this, ignore this email.</p>
    `,
    })
    .then((email) => {
      console.log(email);
    })
    .catch((err) => {
      console.log(err);
    });
}

import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY not found");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetPasswordEmail(to: string, resetLink: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: "MagicManager <reset-password@magic-api.domainfortraining.xyz>",
      to,
      subject: "Redefina sua senha",

      template: {
        id: "reset-password",
        variables: {
          resetLink: resetLink,
        },
      },
    });

    if (error) {
      console.error(error);
    }
  } catch (err) {
    console.error(err);
  }
}

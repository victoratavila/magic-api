import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
console.log("RESEND KEY:", process.env.RESEND_API_KEY);

export async function sendResetPasswordEmail(to: string, resetLink: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: "MagicManager <reset-password@magic-api.domainfortraining.xyz>",
      to,
      subject: "Reset your password",

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

import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY not found");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(to: string, username: string) {
  const firstName = username.trim().split(" ")[0];

  if (firstName) {
    try {
      const { data, error } = await resend.emails.send({
        from: "MagicManager <welcome@magic-api.domainfortraining.xyz>",
        to,
        subject: "Bem-vindo(a) ao MagicManager!",
        template: {
          id: "welcome-to-magicmanager",
          variables: {
            username: firstName,
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
}

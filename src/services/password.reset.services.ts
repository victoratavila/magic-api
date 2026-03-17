import crypto from "crypto";
import bcrypt from "bcrypt";

import { PasswordResetRepository } from "../repositories/passwordReset.repository";
import { sendResetPasswordEmail } from "./emails/sendResetPasswordEmail.services";
import { prisma } from "../db/prisma";

export class PasswordResetService {
  private repo = new PasswordResetRepository();

  /**
   * Usuário solicita reset de senha
   */
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    /**
     * Resposta silenciosa
     * evita email enumeration
     */
    if (!user) return;

    /**
     * gera token seguro
     */
    const token = crypto.randomBytes(32).toString("hex");

    /**
     * hash do token
     */
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    /**
     * expira em 15 minutos
     */
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

    await this.repo.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    if (process.env.DEV_ENV == "true") {
      const resetLink = `http://127.0.0.1:5500/mtg-collection-full.html?token=${token}`;
      await sendResetPasswordEmail(user.email, resetLink);
    } else {
      const resetLink = `https://magic-app.domainfortraining.xyz/reset-password?token=${token}`;
      await sendResetPasswordEmail(user.email, resetLink);
    }
  }

  /**
   * Resetar senha
   */
  async resetPassword(token: string, password: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const storedToken = await this.repo.findByTokenHash(tokenHash);

    if (!storedToken) {
      throw new Error("Invalid token");
    }

    /**
     * verifica expiração
     */
    if (storedToken.expiresAt < new Date()) {
      throw new Error("Token expired");
    }

    /**
     * hash da nova senha
     */
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: storedToken.userId },
      data: {
        password: hashedPassword,
      },
    });

    /**
     * token não pode ser reutilizado
     */
    await this.repo.delete(storedToken.id);
  }
}

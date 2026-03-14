import { Request, Response } from "express";
import { PasswordResetService } from "../services/password.reset.services";

export class PasswordResetController {
  private service = new PasswordResetService();

  /**
   * Valida formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(email);
  }

  /**
   * POST /forgot-password
   */
  forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    /**
     * valida se email foi enviado
     */
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    /**
     * valida formato do email
     */
    if (!this.isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    await this.service.requestPasswordReset(email);

    return res.status(200).json({
      message: "If the email exists, a reset link was sent.",
    });
  };

  /**
   * POST /reset-password
   */
  resetPassword = async (req: Request, res: Response) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        message: "Token and password are required",
      });
    }

    try {
      await this.service.resetPassword(token, password);

      return res.status(200).json({
        message: "Password updated successfully",
      });
    } catch {
      return res.status(400).json({
        message: "Invalid or expired token",
      });
    }
  };
}

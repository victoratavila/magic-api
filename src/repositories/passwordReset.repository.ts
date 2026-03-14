import { prisma } from "../db/prisma";

interface CreateTokenDTO {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export class PasswordResetRepository {
  /**
   * Cria token de reset
   */
  async create(data: CreateTokenDTO) {
    return prisma.passwordResetToken.create({
      data,
    });
  }

  /**
   * Busca token pelo hash
   */
  async findByTokenHash(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
  }

  /**
   * Deleta token após uso
   */
  async delete(id: string) {
    return prisma.passwordResetToken.delete({
      where: { id },
    });
  }
}

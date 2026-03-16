import { prisma } from "../db/prisma";
import { CreateUserDTO } from "../dtos/create.user.dto";
import { UpdateUserDTO } from "../dtos/update.user.dto";

export class UserRepository {
  findAllUsers = async () => {
    const users = await prisma.user.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return users;
  };

  createUser = async (data: CreateUserDTO) => {
    const user = await prisma.user.create({ data });
    return user;
  };

  findUserByEmail = async (email: string) => {
    const user = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    return user;
  };

  updatePassword = async (data: UpdateUserDTO) => {
    const updatedInformation = await prisma.user.update({
      where: {
        id: data.userId,
      },

      data: {
        password: data.password,
      },
    });

    return updatedInformation;
  };
}

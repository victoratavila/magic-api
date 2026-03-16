import { CreateUserDTO } from "../dtos/create.user.dto";
import { UpdateUserDTO } from "../dtos/update.user.dto";
import { UserRepository } from "../repositories/users.repository";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const secret = process.env.JWT_SECRET;

export class UserService {
  constructor(private repo: UserRepository) {}

  async findAllUsers() {
    return await this.repo.findAllUsers();
  }

  async createUser(data: CreateUserDTO) {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    return await this.repo.createUser({
      ...data,
      password: hashedPassword,
    });
  }

  async validateUser(email: string, password: string) {
    const userFound = await this.repo.findUserByEmail(email);

    // Check if the email exists
    if (userFound == null) {
      throw new Error("AUTH_INVALID_CREDENTIALS");
    }

    // Check if the password is correct
    const authentication = bcrypt
      .compare(password, userFound.password)
      .then(function (result) {
        if (result == false) {
          throw new Error("AUTH_INVALID_CREDENTIALS");
        } else {
          if (!secret) {
            throw new Error("JWT_SECRET not defined");
          }

          const token = jwt.sign(
            {
              sub: userFound.id,
              email: userFound.email,
              role: userFound.role,
            },
            secret,
            { expiresIn: "48h" },
          );

          return {
            token,
            user: {
              id: userFound.id,
              username: userFound.username,
              email: userFound.email,
              role: userFound.role,
            },
          };
        }
      });
    return authentication;
  }

  async updatePassword(data: UpdateUserDTO) {
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const hashedInfo = {
      password: hashedPassword,
      userId: data.userId,
    };
    return await this.repo.updatePassword(hashedInfo);
  }
}

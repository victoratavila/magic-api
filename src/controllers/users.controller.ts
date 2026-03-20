import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/users.services";
import { createUserDTO } from "../dtos/create.user.dto";
import { Prisma } from "@prisma/client";
import { loginUserDTO } from "../dtos/login.user.dto";
import { UpdateUserDTO } from "../dtos/update.user.dto";

export class UserController {
  constructor(private service: UserService) {}

  findAllUsers = async (req: Request, res: Response) => {
    const users = await this.service.findAllUsers();
    return res.status(200).json(users);
  };

  createUser = async (req: Request, res: Response) => {
    const validation = createUserDTO.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    try {
      const user = await this.service.createUser({
        ...validation.data,
      });

      res.status(200).json(user);
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return res.status(409).json({
            message: "Este e-mail já está em uso. Tente um diferente.",
          });
        }
      }

      return res.status(500).json({
        message: "Internal server error",
      });
    }
  };

  validateUser = async (req: Request, res: Response) => {
    const credentials = loginUserDTO.safeParse(req.body);

    if (!credentials.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: credentials.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await this.service.validateUser(
        credentials.data.email,
        credentials.data.password,
      );

      return res.status(200).json(result);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "AUTH_INVALID_CREDENTIALS"
      ) {
        return res.status(401).json({
          message: "Email ou senha inválido(s), por favor tente novamente",
        });
      }

      return res.status(500).json({
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  updatePassword = async (req: Request, res: Response) => {
    const { password } = req.body;

    if (password == null || password == undefined) {
      return res.status(400).json({
        Error: "please provide new password to update",
      });
    }

    if (!req.user) {
      return res.status(403).json({
        Error: "Access denied",
        Reason: "No token provided",
      });
    } else {
      const userId = req.user.sub;

      const data = {
        userId: userId,
        password: password,
      };

      const validation = UpdateUserDTO.safeParse(data);

      if (!validation.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validation.error.flatten().fieldErrors,
        });
      }

      try {
        const updatePassword = this.service.updatePassword(data);
        res.json(updatePassword);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "AUTH_INVALID_CREDENTIALS"
        ) {
          return res.status(401).json({
            message: "Email ou senha inválido(s), por favor tente novamente",
          });
        }

        return res.status(500).json({
          message: "Internal server error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };
}

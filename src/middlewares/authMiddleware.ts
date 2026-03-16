import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Access denied: token not provided",
    });
  }

  const [, token] = authHeader.split(" ");

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({
      message: "JWT secret not configured",
    });
  }

  if (!token) {
    return res.status(401).json({
      message: "Token not provided",
    });
  }

  try {
    const decoded = jwt.verify(token, secret) as {
      sub: string;
      email: string;
      role: string;
      iat?: number;
      exp?: number;
    };

    req.user = decoded;

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

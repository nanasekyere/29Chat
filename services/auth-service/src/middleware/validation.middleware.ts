import { AppError } from "@29chat/common";
import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import * as tokenService from "../services/token.service";

export const validateRequest = (schema: z.ZodObject<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue: any) => ({
          message: `${issue.path.join(".")} is ${issue.message}`,
        }));
        return res.status(400).json({ message: errorMessages });
      }
      return res.status(500).json({ message: "Validation error" });
    }
  };
};

export const validateRefreshToken = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const { refreshToken } = req.body;

  try {
    if (!refreshToken) {
      throw new AppError("Refresh token required", 401);
    }
    const payload = tokenService.verifyRefreshToken(refreshToken);
    const valid = await tokenService.isRefreshTokenValid(
      payload.id,
      refreshToken,
    );

    if (!valid) {
      throw new AppError("Refresh token revoked", 401);
    }
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("Refresh token revoked or invalid", 401));
  }
};

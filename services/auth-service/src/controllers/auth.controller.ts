import { Request, Response, NextFunction } from "express";
import passport from "../passport";
import { AppError, ChatUser } from "@29chat/common";
import * as authService from "../services/auth.service";
import * as tokenService from "../services/token.service";
import * as userService from "../services/user.service";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { email, password, name } = req.body;

  try {
    const { user, token, refreshToken } = await authService.register({
      email,
      password,
      name,
    });
    res.status(201).json({ user, token, refreshToken });
  } catch (error) {
    next(error);
  }
}

export function login(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate(
    "local",
    { session: false },
    (err: Error | null, user: ChatUser | false) => {
      if (err) return next(err);
      if (!user)
        return res.status(401).json({ message: "Invalid email or password" });

      const token = tokenService.createAccessToken(user);
      const refreshToken = tokenService.createRefreshToken(user);
      const { password: _, ...sanitizedUser } = user;
      res.status(200).json({ user: sanitizedUser, token, refreshToken });
    },
  )(req, res, next);
}

export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { refreshToken } = req.body;
  const { id } = req.user!

  try {
    await tokenService.revokeRefreshToken(id, refreshToken);

    const user = await userService.getUser(id);
    const newAccessToken = tokenService.createAccessToken(user);
    const newRefreshToken = await tokenService.createRefreshToken(user);
    const { password: _, ...sanitizedUser } = user;

    res
      .status(200)
      .json({
        user: sanitizedUser,
        token: newAccessToken,
        refreshToken: newRefreshToken,
      });

  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("Refresh token revoked or invalid", 401));
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await tokenService.revokeAllRefreshTokens(req.user!.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("Failed to remove token from db", 401));
  }
}

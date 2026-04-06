import { Request, Response, NextFunction, CookieOptions } from "express";
import passport from "../passport";
import { AppError } from "@29chat/common";
import { ChatUser } from "@29chat/database";
import * as authService from "../services/auth.service";
import * as tokenService from "../services/token.service";
import * as userService from "../services/user.service";

const COOKIE_PROPS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  signed: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
} as CookieOptions;

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
    res
      .status(201)
      .cookie("refreshToken", refreshToken, COOKIE_PROPS)
      .json({ user, token });
  } catch (error) {
    next(error);
  }
}

export function login(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate(
    "local",
    { session: false },
    async (err: Error | null, user: ChatUser | false) => {
      if (err) return next(err);
      if (!user)
        return res.status(401).json({ message: "Invalid email or password" });

      const token = tokenService.createAccessToken(user);
      const refreshToken = await tokenService.createRefreshToken(user);
      const { password: _, ...sanitizedUser } = user;

      res
        .status(200)
        .cookie("refreshToken", refreshToken, COOKIE_PROPS)
        .json({ user: sanitizedUser, token });
    },
  )(req, res, next);
}

export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { refreshToken } = req.signedCookies;
  const id = req.headers["x-user-id"] as string;

  try {
    if (!refreshToken) return next(new AppError("No refresh token", 401));

    const isValid = await tokenService.isRefreshTokenValid(id, refreshToken);
    if (!isValid) throw new AppError("Refresh token revoked or invalid", 401);

    await tokenService.revokeRefreshToken(id, refreshToken);

    const user = await userService.getUser(id);
    const newAccessToken = tokenService.createAccessToken(user);
    const newRefreshToken = await tokenService.createRefreshToken(user);
    const { password: _, ...sanitizedUser } = user;

    res
      .status(200)
      .cookie("refreshToken", newRefreshToken, COOKIE_PROPS)
      .json({
        user: sanitizedUser,
        token: newAccessToken,
      });
  } catch (error) {
    res.clearCookie("refreshToken");
    if (error instanceof AppError) return next(error);
    return next(new AppError("Refresh token revoked or invalid", 401));
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await tokenService.revokeAllRefreshTokens(req.headers['x-user-id'] as string);
    res.status(204).send();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("Failed to remove token from db", 401));
  }
}

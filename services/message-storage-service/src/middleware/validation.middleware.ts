import { Request, Response, NextFunction } from "express";
import { AppError } from "@29chat/common";
import { z, ZodError } from "zod";

export const validateRequest = (
  schema: z.ZodTypeAny,
  source: "body" | "query" | "params" = "body",
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req[source]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues
          .map((issue) => `${issue.path.join(".")} is ${issue.message}`)
          .join(", ");
        return next(new AppError(message, 400));
      }
      next(error);
    }
  };
};

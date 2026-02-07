import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

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
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

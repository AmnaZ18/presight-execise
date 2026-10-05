import type { Request, Response } from "express";
import type { ZodType } from "zod";

export function parseQuery<T>(schema: ZodType<T, any, any>, req: Request, res: Response): T | undefined {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: "Invalid query parameters", issues: result.error.issues });
    return undefined;
  }
  return result.data;
}

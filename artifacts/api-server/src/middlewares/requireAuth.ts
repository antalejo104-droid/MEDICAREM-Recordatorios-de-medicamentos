import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

export const requireAuth: RequestHandler = (req, res, next) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Inicia sesión para continuar." });
    return;
  }

  res.locals.clerkUserId = auth.userId;
  next();
};

export function getClerkUserId(res: Parameters<RequestHandler>[1]): string {
  const clerkUserId = res.locals.clerkUserId;
  if (typeof clerkUserId !== "string") {
    throw new Error("Authenticated Clerk user is missing from request context.");
  }
  return clerkUserId;
}

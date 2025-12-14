import type { Request, Response, NextFunction } from "express";
import { auth } from "../firebase/admin";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Missing Authorization Bearer token" });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    (req as any).user = decoded; // decoded.uid
    return next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

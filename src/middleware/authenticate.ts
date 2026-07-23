import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: jwt.JwtPayload;
    }
  }
}

const authenticate = (
  req: Request<{}, {}, {}>,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw createHttpError(401, "Authentication required");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as jwt.JwtPayload;
    next();
  } catch (error) {
    throw createHttpError(401, "Invalid or expired token");
  }
};

export default authenticate;

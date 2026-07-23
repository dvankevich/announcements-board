import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { Response } from "express";
import prisma from "../../prisma/client.ts";
import {
  ACCESS_TOKEN_LIFETIME,
  REFRESH_TOKEN_LIFETIME,
} from "../constants/time.ts";

export const createTokens = async (userId: number) => {
  const accessToken = jwt.sign(
    { sub: String(userId) },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_LIFETIME / 1000 },
  );

  const refreshToken = crypto.randomBytes(40).toString("hex");

  await prisma.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME),
    },
  });

  return { accessToken, refreshToken };
};

export const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_LIFETIME,
  });
};

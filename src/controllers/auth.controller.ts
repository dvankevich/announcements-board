import bcrypt from "bcrypt";
import createHttpError from "http-errors";
import type { Request, Response } from "express";
import prisma from "../../prisma/client.ts";
import { createTokens, setRefreshTokenCookie } from "../services/auth.ts";
import type { RegisterBody, LoginBody } from "../validators/auth.validator.ts";

export const register = async (
  req: Request<{}, {}, RegisterBody>,
  res: Response,
) => {
  const { username, email, password, name } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingUser) {
    throw createHttpError(409, "Username or email already taken");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      name,
    },
  });

  const tokens = await createTokens(user.id);
  setRefreshTokenCookie(res, tokens.refreshToken);

  res.status(201).json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
  });
};

export const login = async (req: Request<{}, {}, LoginBody>, res: Response) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw createHttpError(401, "Invalid credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw createHttpError(401, "Invalid credentials");
  }

  const tokens = await createTokens(user.id);
  setRefreshTokenCookie(res, tokens.refreshToken);

  res.status(200).json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
  });
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken =
    req.cookies.refreshToken ||
    (req.body as { refreshToken?: string }).refreshToken;

  if (!refreshToken) {
    throw createHttpError(401, "Refresh token not provided");
  }

  const storedToken = await prisma.refreshToken.findFirst({
    where: { token: refreshToken },
  });

  if (!storedToken) {
    throw createHttpError(401, "Invalid refresh token");
  }

  if (new Date() > storedToken.expiresAt) {
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    throw createHttpError(401, "Refresh token expired");
  }

  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  const tokens = await createTokens(storedToken.userId);
  setRefreshTokenCookie(res, tokens.refreshToken);

  res.status(200).json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
};

export const logout = async (req: Request, res: Response) => {
  const refreshToken =
    req.cookies.refreshToken ||
    (req.body as { refreshToken?: string }).refreshToken;

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(204).end();
};

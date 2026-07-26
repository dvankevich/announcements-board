import type { Request, Response } from "express";
import prisma from "../../prisma/client.ts";
import type { GetAnnouncementsQuery } from "../validators/announcements.validator.ts";

export const getAnnouncements = async (
  _req: Request,
  res: Response<any, { query: GetAnnouncementsQuery }>,
) => {
  const { page, search, sort } = res.locals.query;

  const perPage = 10;
  const skip = (page - 1) * perPage;

  const where =
    search && search.trim()
      ? {
          title: {
            contains: search.trim(),
            mode: "insensitive" as const,
          },
        }
      : {};

  const orderBy = {
    createdAt: sort === "oldest" ? ("asc" as const) : ("desc" as const),
  };

  const [data, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy,
      skip,
      take: perPage,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
      },
    }),
    prisma.announcement.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  res.status(200).json({
    data,
    pagination: {
      total,
      page,
      totalPages,
      perPage,
    },
  });
};

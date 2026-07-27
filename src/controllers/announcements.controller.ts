import type { Request, Response } from "express";
import createHttpError from "http-errors";
import prisma from "../../prisma/client.ts";
import type {
  GetAnnouncementsQuery,
  AnnouncementIdParam,
  CreateAnnouncementBody,
  UpdateAnnouncementBody,
} from "../validators/announcements.validator.ts";

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

export const getAnnouncementById = async (
  req: Request<AnnouncementIdParam>,
  res: Response,
) => {
  const { id } = req.params;

  const announcement = await prisma.announcement.findUnique({
    where: { id },
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
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  res.status(200).json(announcement);
};

export const createAnnouncement = async (
  req: Request<{}, {}, CreateAnnouncementBody>,
  res: Response,
) => {
  const userId = Number(req.user!.sub);
  const { title, description, price, category } = req.body;

  const announcement = await prisma.announcement.create({
    data: {
      title,
      description,
      price,
      category,
      userId,
    },
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
  });

  res.status(201).json(announcement);
};

export const updateAnnouncement = async (
  req: Request<AnnouncementIdParam, {}, UpdateAnnouncementBody>,
  res: Response,
) => {
  const { id } = req.params;
  const userId = Number(req.user!.sub);

  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  if (announcement.userId !== userId) {
    throw createHttpError(403, "Access denied");
  }

  const updated = await prisma.announcement.update({
    where: { id },
    data: req.body,
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
  });

  res.status(200).json(updated);
};

export const deleteAnnouncement = async (
  req: Request<AnnouncementIdParam>,
  res: Response,
) => {
  const { id } = req.params;
  const userId = Number(req.user!.sub);

  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  if (announcement.userId !== userId) {
    throw createHttpError(403, "Access denied");
  }

  await prisma.announcement.delete({
    where: { id },
  });

  res.status(204).end();
};

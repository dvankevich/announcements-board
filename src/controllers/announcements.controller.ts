import type { Request, Response } from "express";
import createHttpError from "http-errors";
import prisma from "../../prisma/client.ts";
import type {
  GetAnnouncementsQuery,
  AnnouncementIdParam,
  CreateAnnouncementBody,
  UpdateAnnouncementBody,
} from "../validators/announcements.validator.ts";
import logger from "../logger.ts";
import fs from "fs/promises";
import cloudinary from "../config/cloudinary.ts";

export const getAnnouncements = async (
  _req: Request,
  res: Response<any, { query: GetAnnouncementsQuery }>,
) => {
  const { page, search, sort } = res.locals.query;

  logger.debug({ page, search, sort }, "Get announcements list");

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

  logger.debug({ total, page, totalPages }, "Announcements list fetched");

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

  logger.debug({ announcementId: id }, "Get announcement by id");

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
    logger.debug({ announcementId: id }, "Announcement not found");
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

  logger.debug({ userId, title, category, price }, "Create announcement attempt");

  let imageUrl: string | undefined;

  if (req.file) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "announcements",
      });
      imageUrl = result.secure_url;
    } catch (error) {
      logger.error(error, "Cloudinary upload failed");
      throw createHttpError(500, "Failed to upload image");
    } finally {
      // remove temp image file
      await fs.unlink(req.file.path).catch(() => {});
    }
  }

  const announcement = await prisma.announcement.create({
    data: {
      title,
      description,
      price,
      category,
      imageUrl,
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

  logger.info(
    {
      announcementId: announcement.id,
      userId,
      title: announcement.title,
      category: announcement.category,
      hasImage: !!imageUrl,
    },
    "Announcement created",
  );

  res.status(201).json(announcement);
};

export const updateAnnouncement = async (
  req: Request<AnnouncementIdParam, {}, UpdateAnnouncementBody>,
  res: Response,
) => {
  const { id } = req.params;
  const userId = Number(req.user!.sub);

  logger.debug({ announcementId: id, userId }, "Update announcement attempt");

  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    logger.debug({ announcementId: id }, "Update failed: announcement not found");
    throw createHttpError(404, "Announcement not found");
  }

  if (announcement.userId !== userId) {
    logger.debug(
      { announcementId: id, userId, ownerId: announcement.userId },
      "Update failed: access denied",
    );
    throw createHttpError(403, "Access denied");
  }

  let imageUrl = announcement.imageUrl;

  if (req.file) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "announcements",
      });
      imageUrl = result.secure_url;
    } catch (error) {
      logger.error(error, "Cloudinary upload failed");
      throw createHttpError(500, "Failed to upload image");
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }
  }

  const updated = await prisma.announcement.update({
    where: { id },
    data: {
      ...req.body,
      imageUrl,
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

  logger.info({ announcementId: id, userId }, "Announcement updated");

  res.status(200).json(updated);
};

export const deleteAnnouncement = async (
  req: Request<AnnouncementIdParam>,
  res: Response,
) => {
  const { id } = req.params;
  const userId = Number(req.user!.sub);

  logger.debug({ announcementId: id, userId }, "Delete announcement attempt");

  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    logger.debug({ announcementId: id }, "Delete failed: announcement not found");
    throw createHttpError(404, "Announcement not found");
  }

  if (announcement.userId !== userId) {
    logger.debug(
      { announcementId: id, userId, ownerId: announcement.userId },
      "Delete failed: access denied",
    );
    throw createHttpError(403, "Access denied");
  }

  await prisma.announcement.delete({
    where: { id },
  });

  logger.info(
    { announcementId: id, userId },
    "Announcement deleted",
  );

  res.status(204).end();
};

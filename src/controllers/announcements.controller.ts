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

function getPublicIdFromUrl(url: string): string | null {
  try {
    // Example URL:
    // https://res.cloudinary.com/dvc0lg6q7/image/upload/v1722345678/announcements/abc123.jpg
    const parts = url.split("/");
    const uploadIndex = parts.findIndex((part) => part === "upload");

    if (uploadIndex === -1) return null;

    // Take everything after "upload"
    let pathParts = parts.slice(uploadIndex + 1);

    // Remove version segment (v1234567890) if present
    if (pathParts[0]?.startsWith("v") && /^v\d+$/.test(pathParts[0])) {
      pathParts = pathParts.slice(1);
    }

    const publicIdWithExtension = pathParts.join("/");

    // Remove file extension (.jpg, .png, etc.)
    return publicIdWithExtension.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
}

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

  res.set("X-Total-Count", String(total));

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
      // Remove temporary file
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

  const hasBodyFields = Object.values(req.body).some(
    (value) => value !== undefined && value !== "",
  );

  if (!hasBodyFields && !req.file) {
    throw createHttpError(422, "At least one field must be provided");
  }

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

  logger.debug(
    {
      hasFile: !!req.file,
      filePath: req.file?.path,
      fileOriginalName: req.file?.originalname,
      oldImageUrl: announcement.imageUrl,
    },
    "Image upload check",
  );

  if (req.file) {
    try {
      logger.debug({ path: req.file.path }, "Uploading new image to Cloudinary");

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "announcements",
      });

      imageUrl = result.secure_url;

      logger.debug(
        {
          newImageUrl: result.secure_url,
          newPublicId: result.public_id,
        },
        "New image uploaded successfully",
      );

      // Delete old image from Cloudinary
      if (announcement.imageUrl) {
        const oldPublicId = getPublicIdFromUrl(announcement.imageUrl);

        logger.debug(
          {
            oldImageUrl: announcement.imageUrl,
            extractedPublicId: oldPublicId,
          },
          "Trying to delete old image from Cloudinary",
        );

        if (oldPublicId) {
          const destroyResult = await cloudinary.uploader.destroy(oldPublicId);
          logger.debug({ oldPublicId, destroyResult }, "Cloudinary destroy result");
        } else {
          logger.warn(
            { oldImageUrl: announcement.imageUrl },
            "Could not extract public_id from old image URL",
          );
        }
      }
    } catch (error) {
      logger.error(error, "Cloudinary upload failed");
      throw createHttpError(500, "Failed to upload image");
    } finally {
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
          logger.debug({ path: req.file.path }, "Temporary file deleted successfully");
        } catch (unlinkError) {
          logger.error(
            { path: req.file.path, err: unlinkError },
            "Failed to delete temporary file",
          );
        }
      }
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

  // Delete image from Cloudinary if exists
  if (announcement.imageUrl) {
    try {
      const publicId = getPublicIdFromUrl(announcement.imageUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
        logger.debug({ publicId }, "Image deleted from Cloudinary");
      }
    } catch (error) {
      logger.error(error, "Failed to delete image from Cloudinary");
    }
  }

  await prisma.announcement.delete({
    where: { id },
  });

  logger.info({ announcementId: id, userId }, "Announcement deleted");

  res.status(204).end();
};

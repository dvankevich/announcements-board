import { Router } from "express";
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcements.controller.ts";
import {
  validateQuery,
  validateParams,
  validateBody,
} from "../middleware/validate.ts";
import authenticate from "../middleware/authenticate.ts";
import { upload } from "../middleware/upload.ts";
import {
  GetAnnouncementsQuerySchema,
  AnnouncementIdParamSchema,
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
} from "../validators/announcements.validator.ts";

const router = Router();

router.get(
  "/",
  validateQuery(GetAnnouncementsQuerySchema),
  getAnnouncements,
);

router.get(
  "/:id",
  validateParams(AnnouncementIdParamSchema),
  getAnnouncementById,
);

router.post(
  "/",
  authenticate,
  upload.single("image"),                    // ← спочатку multer
  validateBody(CreateAnnouncementSchema),    // ← потім валідація текстових полів
  createAnnouncement,
);

router.patch(
  "/:id",
  authenticate,
  validateParams(AnnouncementIdParamSchema),
  upload.single("image") as any,                    // ← спочатку multer
  validateBody(UpdateAnnouncementSchema),
  updateAnnouncement,
);

router.delete(
  "/:id",
  authenticate,
  validateParams(AnnouncementIdParamSchema),
  deleteAnnouncement,
);

export default router;

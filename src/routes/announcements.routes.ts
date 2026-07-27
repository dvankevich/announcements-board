import { Router } from "express";
import {
  getAnnouncements,
  getAnnouncementById,
} from "../controllers/announcements.controller.ts";
import { validateQuery, validateParams } from "../middleware/validate.ts";
import {
  GetAnnouncementsQuerySchema,
  AnnouncementIdParamSchema,
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

export default router;

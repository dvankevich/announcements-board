import { Router } from "express";
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
} from "../controllers/announcements.controller.ts";
import { validateQuery, validateParams, validateBody } from "../middleware/validate.ts";
import authenticate  from "../middleware/authenticate.ts";
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
  validateBody(CreateAnnouncementSchema),
  createAnnouncement,
);

router.patch(
  "/:id",
  authenticate,
  validateParams(AnnouncementIdParamSchema),
  validateBody(UpdateAnnouncementSchema),
  updateAnnouncement,
);

export default router;

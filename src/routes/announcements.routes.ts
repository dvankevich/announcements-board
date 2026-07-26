import { Router } from "express";
import { getAnnouncements } from "../controllers/announcements.controller.ts";
import { validateQuery } from "../middleware/validate.ts";
import { GetAnnouncementsQuerySchema } from "../validators/announcements.validator.ts";

const router = Router();

router.get(
  "/",
  validateQuery(GetAnnouncementsQuerySchema),
  getAnnouncements,
);

export default router;
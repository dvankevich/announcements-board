import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
} from "../controllers/auth.controller.ts";
import { validateBody } from "../middleware/validate.ts";
import { RegisterSchema, LoginSchema } from "../validators/auth.validator.ts";

const router = Router();

router.post("/register", validateBody(RegisterSchema), register);
router.post("/login", validateBody(LoginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;

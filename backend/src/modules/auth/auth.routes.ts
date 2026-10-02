import { Router } from "express";
import * as authController from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.schemas";
import { validate } from "../../middleware/validate";
import { requireAuth } from "../../middleware/authenticate";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.post("/register", validate(registerSchema), asyncHandler(authController.register));
router.post("/login", validate(loginSchema), asyncHandler(authController.login));
router.get("/me", requireAuth, asyncHandler(authController.me));
router.post("/logout", requireAuth, asyncHandler(authController.logout));

export default router;

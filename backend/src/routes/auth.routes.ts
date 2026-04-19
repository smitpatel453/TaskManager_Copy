import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
const authController = new AuthController();

router.post("/login", (req, res) => authController.login(req, res));
router.post("/signup", (req, res) => authController.signup(req, res));
router.get("/verify-email", (req, res) => authController.verifyEmail(req, res));
router.post("/change-password", authMiddleware, (req, res) => authController.changePassword(req, res));

export default router;

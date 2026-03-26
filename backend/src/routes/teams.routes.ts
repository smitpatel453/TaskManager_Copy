import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { TeamsController } from "../controllers/teams.controller.js";

const router = Router();
const teamsController = new TeamsController();

router.use(authMiddleware);
router.get("/", (req, res) => teamsController.getTeams(req, res));
router.post("/", (req, res) => teamsController.createTeam(req, res));

export default router;

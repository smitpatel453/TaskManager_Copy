import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { TeamsController } from "../controllers/teams.controller.js";

const router = Router();
const teamsController = new TeamsController();

router.use(authMiddleware);
router.get("/", (req, res) => teamsController.getTeams(req, res));
router.post("/", (req, res) => teamsController.createTeam(req, res));
router.get("/:id", (req, res) => teamsController.getTeam(req, res));
router.patch("/:id", (req, res) => teamsController.updateTeam(req, res));
router.delete("/:id", (req, res) => teamsController.deleteTeam(req, res));
router.post("/:id/members", (req, res) => teamsController.addMember(req, res));
router.delete("/:id/members/:memberId", (req, res) => teamsController.removeMember(req, res));
router.post("/:id/leave", (req, res) => teamsController.leaveTeam(req, res));

export default router;

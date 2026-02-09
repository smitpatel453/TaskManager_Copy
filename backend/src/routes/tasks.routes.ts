import { Router } from "express";
import { TasksController } from "../controllers/tasks.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const tasksController = new TasksController();

router.use(authMiddleware);
router.post("/", (req, res) => tasksController.createTask(req, res));
router.get("/", (req, res) => tasksController.getTasks(req, res));
router.get("/:id/details", (req, res) => tasksController.getTaskDetails(req, res));
export default router;

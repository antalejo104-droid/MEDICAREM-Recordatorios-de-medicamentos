import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import caregiversRouter from "./caregivers";
import eventsRouter from "./events";
import medicationsRouter from "./medications";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use("/medicarem", requireAuth);
router.use("/medicarem", profileRouter);
router.use("/medicarem", eventsRouter);
router.use("/medicarem", medicationsRouter);
router.use("/medicarem", caregiversRouter);

export default router;

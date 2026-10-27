import { Router, type IRouter } from "express";
import healthRouter from "./health";
import medicaremRouter from "./medicarem";

const router: IRouter = Router();

router.use(healthRouter);
router.use(medicaremRouter);

export default router;

import { Router } from "express";
import { userController } from "./user.controller";

const router = Router();

// User Route
router.post('/signup', userController.createUser);
router.post('/login', userController.loginUser)

export const userRoute = router;
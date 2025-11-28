// server/src/api/routes/user.routes.ts
import { Router } from "express";
import {
  registerUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  sendPasswordReset,
} from "../controllers/user.controller";

const router = Router();

/**
 * /api/users routes
 *
 * POST   /register         -> registerUser
 * GET    /:uid             -> getUserProfile
 * PUT    /update/:uid      -> updateUserProfile
 * DELETE /delete/:uid      -> deleteUser
 * POST   /reset-password   -> sendPasswordReset
 */
router.post("/register", registerUser);
router.post("/reset-password", sendPasswordReset);

router.put("/update/:uid", updateUserProfile);
router.delete("/delete/:uid", deleteUser);

// OJO: dejar esta al final para que no choque con rutas tipo /register
router.get("/:uid", getUserProfile);

export default router;

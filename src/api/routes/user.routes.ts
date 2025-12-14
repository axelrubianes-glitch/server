import { Router } from "express";
import {
  registerUser,
  updateUserProfile,
  deleteUser,
  sendPasswordReset,
  getUserByUid,
} from "../controllers/user.controller";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// Lo que ya te funciona
router.post("/register", registerUser);
router.put("/update/:uid", updateUserProfile);
router.post("/reset-password", sendPasswordReset);

// LO QUE TE FALTABA PARA PERFIL (GET por uid)
router.get("/:uid", getUserByUid);

// LO QUE TE FALTABA PARA ELIMINAR (DELETE protegido con token)
router.delete("/:uid", requireAuth, deleteUser);

export default router;

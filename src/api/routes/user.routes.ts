// server/src/api/routes/user.routes.ts
import { Router } from "express";
import {
  registerUser,
  getUserByUid,
  updateUserProfile,
  deleteUser,
  sendPasswordReset,
} from "../controllers/user.controller";

const router = Router();

/**
 * Base: /api/users
 */

// Crear/asegurar perfil en Firestore (lo llamas después de registrarte en Firebase Auth)
router.post("/register", registerUser);

// Perfil (lo que tu frontend está intentando: /api/users/:uid)
router.get("/:uid", getUserByUid);
router.put("/:uid", updateUserProfile);
router.delete("/:uid", deleteUser);

// Compatibilidad con tus rutas antiguas (por si aún las usas en algún lado)
router.put("/update/:uid", updateUserProfile);
router.delete("/delete/:uid", deleteUser);

router.post("/reset-password", sendPasswordReset);

export default router;

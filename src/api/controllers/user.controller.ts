// server/src/api/controllers/user.controller.ts
import type { Request, Response } from "express";
import { auth, db } from "../firebase/admin";

type UserDoc = {
  uid: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  age?: number | null;
  displayName?: string;
  createdAt?: string;
  updatedAt?: string;
};

const usersCol = db.collection("users");

function nowISO() {
  return new Date().toISOString();
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * POST /api/users/register
 * Crea/actualiza el documento del usuario en Firestore (y opcionalmente displayName en Auth)
 */
export async function registerUser(req: Request, res: Response) {
  try {
    const { uid, email, firstName, lastName, age } = req.body ?? {};

    if (!uid || typeof uid !== "string") {
      return res.status(400).json({ message: "uid is required" });
    }

    const ageNum = toNumberOrNull(age);
    const displayName =
      [firstName, lastName].filter(Boolean).join(" ").trim() || undefined;

    const payload: UserDoc = {
      uid,
      email,
      firstName,
      lastName,
      age: ageNum,
      displayName,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await usersCol.doc(uid).set(payload, { merge: true });

    // Si el usuario ya existe en Firebase Auth, actualiza displayName (no es obligatorio)
    if (displayName) {
      try {
        await auth.updateUser(uid, { displayName });
      } catch {
        // Si aún no existe en Auth o falla, no tumbar el registro
      }
    }

    return res.status(201).json({ message: "User registered", user: payload });
  } catch (err: any) {
    return res.status(500).json({
      message: "Error registering user",
      error: err?.message ?? String(err),
    });
  }
}

/**
 * GET /api/users/:uid
 * Devuelve el perfil del usuario desde Firestore.
 * Si no existe el doc, responde 404 (esto es lo que te estaba pasando).
 */
export async function getUserProfile(req: Request, res: Response) {
  try {
    const { uid } = req.params;

    if (!uid) return res.status(400).json({ message: "uid is required" });

    const snap = await usersCol.doc(uid).get();

    if (!snap.exists) {
      return res.status(404).json({ message: "User profile not found" });
    }

    return res.status(200).json({ user: snap.data() });
  } catch (err: any) {
    return res.status(500).json({
      message: "Error loading user profile",
      error: err?.message ?? String(err),
    });
  }
}

/**
 * PUT /api/users/update/:uid
 * Actualiza datos del perfil en Firestore (y displayName en Auth).
 */
export async function updateUserProfile(req: Request, res: Response) {
  try {
    const { uid } = req.params;
    const { firstName, lastName, age, email } = req.body ?? {};

    if (!uid) return res.status(400).json({ message: "uid is required" });

    const ageNum = toNumberOrNull(age);
    const displayName =
      [firstName, lastName].filter(Boolean).join(" ").trim() || undefined;

    const updates: Partial<UserDoc> = {
      firstName,
      lastName,
      email,
      age: ageNum,
      displayName,
      updatedAt: nowISO(),
    };

    await usersCol.doc(uid).set(updates, { merge: true });

    if (displayName || email) {
      try {
        await auth.updateUser(uid, {
          displayName: displayName,
          email: typeof email === "string" && email ? email : undefined,
        });
      } catch {
        // No rompas la actualización si Auth falla
      }
    }

    return res.status(200).json({ message: "Profile updated", updates });
  } catch (err: any) {
    return res.status(500).json({
      message: "Error updating profile",
      error: err?.message ?? String(err),
    });
  }
}

/**
 * DELETE /api/users/delete/:uid
 * Borra usuario de Firebase Auth y su doc en Firestore
 */
export async function deleteUser(req: Request, res: Response) {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ message: "uid is required" });

    // Firestore doc
    await usersCol.doc(uid).delete().catch(() => {});

    // Auth user
    await auth.deleteUser(uid).catch(() => {});

    return res.status(200).json({ message: "User deleted" });
  } catch (err: any) {
    return res.status(500).json({
      message: "Error deleting user",
      error: err?.message ?? String(err),
    });
  }
}

/**
 * POST /api/users/reset-password
 * Genera link de reseteo (normalmente se envía por email desde un servicio)
 */
export async function sendPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body ?? {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "email is required" });
    }

    const link = await auth.generatePasswordResetLink(email);
    return res.status(200).json({ message: "Reset link generated", link });
  } catch (err: any) {
    return res.status(500).json({
      message: "Error generating reset link",
      error: err?.message ?? String(err),
    });
  }
}

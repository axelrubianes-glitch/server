import type { Request, Response } from "express";
import admin, { auth, db } from "../firebase/admin";

// Colección donde guardas perfiles (ajústala si la tuya se llama distinto)
const USERS_COL = "users";

function pick<T extends object>(obj: any, keys: (keyof T)[]): Partial<T> {
  const out: any = {};
  for (const k of keys) if (obj?.[k] !== undefined) out[k] = obj[k];
  return out;
}

/**
 * POST /api/users/register
 * Crea/actualiza el doc del usuario (no toca Auth, porque el Auth lo hace Firebase client).
 */
export async function registerUser(req: Request, res: Response) {
  try {
    const { uid, email, firstName, lastName, age, displayName } = req.body || {};

    if (!uid || !email) {
      return res.status(400).json({ message: "uid and email are required" });
    }

    const payload = {
      uid,
      email,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      age: age ?? null,
      displayName: displayName ?? "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // set con merge para no pisar todo
    await db.collection(USERS_COL).doc(uid).set(payload, { merge: true });

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: "Register failed", error: err?.message });
  }
}

/**
 * GET /api/users/:uid
 * Lee el perfil desde Firestore
 */
export async function getUserByUid(req: Request, res: Response) {
  try {
    const { uid } = req.params;

    const ref = db.collection(USERS_COL).doc(uid);
    const snap = await ref.get();

    if (!snap.exists) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ uid, ...snap.data() });
  } catch (err: any) {
    return res.status(500).json({ message: "Get user failed", error: err?.message });
  }
}

/**
 * PUT /api/users/update/:uid
 * Actualiza datos de perfil (solo Firestore)
 */
export async function updateUserProfile(req: Request, res: Response) {
  try {
    const { uid } = req.params;

    // Acepta varias llaves por si tu frontend manda nombres distintos
    const body = req.body || {};
    const updates: any = {
      ...pick<{ firstName: string; lastName: string; age: number }>(body, [
        "firstName",
        "lastName",
        "age",
      ]),
      // compat: si llegan en español
      ...(body.nombres !== undefined ? { firstName: body.nombres } : {}),
      ...(body.apellidos !== undefined ? { lastName: body.apellidos } : {}),
      ...(body.edad !== undefined ? { age: body.edad } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection(USERS_COL).doc(uid).set(updates, { merge: true });

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: "Update failed", error: err?.message });
  }
}

/**
 * DELETE /api/users/:uid   (PROTEGIDO)
 * Borra Firestore + borra el usuario en Firebase Auth de manera server-side
 */
export async function deleteUser(req: Request, res: Response) {
  try {
    const { uid } = req.params;
    const decodedUid = (req as any).user?.uid;

    if (!decodedUid) return res.status(401).json({ message: "Unauthorized" });
    if (decodedUid !== uid) return res.status(403).json({ message: "Forbidden" });

    // 1) Borra Firestore (no falla si no existe)
    await db.collection(USERS_COL).doc(uid).delete().catch(() => {});

    // 2) Borra Auth
    await auth.deleteUser(uid);

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: "Delete failed", error: err?.message });
  }
}

/**
 * POST /api/users/reset-password
 * (opcional) genera link; si no lo usas, no afecta.
 */
export async function sendPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "email is required" });

    const link = await auth.generatePasswordResetLink(email);
    return res.status(200).json({ ok: true, link });
  } catch (err: any) {
    return res.status(500).json({ message: "Reset failed", error: err?.message });
  }
}

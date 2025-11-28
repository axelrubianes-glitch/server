// server/src/api/controllers/user.controller.ts
import type { Request, Response } from "express";
import admin, { auth as adminAuth, db } from "../firebase/admin";

/**
 * Si mandas token ID de Firebase en Authorization: Bearer <token>,
 * el backend lo puede usar para obtener uid real.
 * (Si no lo mandas, usará uid de params/body.)
 */
async function getUidFromRequest(req: Request): Promise<string | null> {
  // 1) params
  if (req.params?.uid) return req.params.uid;

  // 2) body
  const maybeUid = (req.body?.uid as string | undefined) ?? null;
  if (maybeUid) return maybeUid;

  // 3) bearer token
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) {
    try {
      const decoded = await adminAuth.verifyIdToken(match[1]);
      return decoded.uid;
    } catch {
      return null;
    }
  }

  return null;
}

export async function registerUser(req: Request, res: Response) {
  try {
    const uid = await getUidFromRequest(req);

    const { email, firstName, lastName, age } = req.body || {};

    if (!uid) {
      return res.status(400).json({ message: "Falta uid (o Authorization Bearer token)." });
    }

    // Crea/actualiza perfil en Firestore (no crees el auth user acá si ya lo crea el frontend)
    const userRef = db.collection("users").doc(uid);

    await userRef.set(
      {
        uid,
        email: email ?? null,
        firstName: firstName ?? "",
        lastName: lastName ?? "",
        age: typeof age === "number" ? age : age ? Number(age) : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(201).json({ message: "User profile saved", uid });
  } catch (err: any) {
    console.error("[registerUser]", err);
    return res.status(500).json({
      message: "Internal Server Error in registerUser",
      error: err?.message ?? String(err),
    });
  }
}

export async function getUserByUid(req: Request, res: Response) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) return res.status(400).json({ message: "Falta uid." });

    const snap = await db.collection("users").doc(uid).get();

    if (!snap.exists) {
      return res.status(404).json({ message: "User doc not found", uid });
    }

    return res.status(200).json({ uid, ...snap.data() });
  } catch (err: any) {
    console.error("[getUserByUid]", err);
    return res.status(500).json({
      message: "Internal Server Error in getUserByUid",
      error: err?.message ?? String(err),
    });
  }
}

export async function updateUserProfile(req: Request, res: Response) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) return res.status(400).json({ message: "Falta uid." });

    const { firstName, lastName, age } = req.body || {};

    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          ...(firstName !== undefined ? { firstName } : {}),
          ...(lastName !== undefined ? { lastName } : {}),
          ...(age !== undefined ? { age: Number(age) } : {}),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return res.status(200).json({ message: "User updated", uid });
  } catch (err: any) {
    console.error("[updateUserProfile]", err);
    return res.status(500).json({
      message: "Internal Server Error in updateUserProfile",
      error: err?.message ?? String(err),
    });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) return res.status(400).json({ message: "Falta uid." });

    // Borra doc en Firestore (admin bypass rules)
    await db.collection("users").doc(uid).delete();

    // Opcional: también borrar usuario de Firebase Auth (si quieres que se elimine la cuenta)
    // Si no quieres esto, comenta estas 2 líneas:
    await adminAuth.deleteUser(uid);

    return res.status(200).json({ message: "User deleted", uid });
  } catch (err: any) {
    console.error("[deleteUser]", err);
    return res.status(500).json({
      message: "Internal Server Error in deleteUser",
      error: err?.message ?? String(err),
    });
  }
}

export async function sendPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Falta email." });

    const link = await adminAuth.generatePasswordResetLink(email);
    // Nota: aquí lo ideal es enviarlo por correo con un provider, pero por ahora devolvemos el link.
    return res.status(200).json({ message: "Reset link generated", link });
  } catch (err: any) {
    console.error("[sendPasswordReset]", err);
    return res.status(500).json({
      message: "Internal Server Error in sendPasswordReset",
      error: err?.message ?? String(err),
    });
  }
}

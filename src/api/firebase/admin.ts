// server/src/api/firebase/admin.ts

import admin, { ServiceAccount } from "firebase-admin";
import fs from "fs";
import path from "path";

/**
 * Loads the Firebase service account configuration.
 *
 * - In production (Render), it reads JSON from FIREBASE_SERVICE_ACCOUNT env var.
 * - In local development, it reads the serviceAccountKey.json file.
 */
function loadServiceAccount(): ServiceAccount {
  const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

  // 1) Producción: JSON en la variable de entorno
  if (rawEnv && rawEnv.trim() !== "") {
    try {
      console.log("[firebase-admin] Using FIREBASE_SERVICE_ACCOUNT from env");
      return JSON.parse(rawEnv) as ServiceAccount;
    } catch (err) {
      console.error(
        "[firebase-admin] Invalid FIREBASE_SERVICE_ACCOUNT JSON:",
        err
      );
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT env variable is not valid JSON."
      );
    }
  }

  // 2) Local: buscamos el archivo físico en varias rutas posibles
  const candidates = [
    // ruta esperada cuando corres desde el root del proyecto
    path.resolve(process.cwd(), "src", "serviceAccountKey.json"),
    // por si lo tienes en la raíz
    path.resolve(process.cwd(), "serviceAccountKey.json"),
    // rutas relativas al propio archivo admin.ts
    path.resolve(__dirname, "..", "..", "serviceAccountKey.json"),
    path.resolve(__dirname, "..", "serviceAccountKey.json"),
    path.resolve(__dirname, "serviceAccountKey.json"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log("[firebase-admin] Using serviceAccountKey.json at:", p);
      const content = fs.readFileSync(p, "utf8");
      return JSON.parse(content) as ServiceAccount;
    }
  }

  console.error(
    "[firebase-admin] serviceAccountKey.json was not found. Tried paths:",
    candidates
  );
  throw new Error(
    "serviceAccountKey.json not found. For local dev, place it in src/serviceAccountKey.json (under the server project)."
  );
}

// Carga credenciales (env primero, luego archivo)
const serviceAccount = loadServiceAccount();

// Inicializar Firebase Admin solo una vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * Firebase Admin Auth instance.
 * Use this to manage users (create, update, delete, generate links).
 */
export const auth = admin.auth();

/**
 * Firebase Admin Firestore instance.
 * Use this to read/write server-side documents.
 */
export const db = admin.firestore();

export default admin;

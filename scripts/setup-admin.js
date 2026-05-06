const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  // Manejar saltos de línea en la llave privada
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

if (!serviceAccount.privateKey || !serviceAccount.clientEmail) {
  console.error("❌ ERROR: Faltan las credenciales de Admin en .env.local");
  console.log("Asegúrate de haber pegado el FIREBASE_ADMIN_CLIENT_EMAIL y FIREBASE_ADMIN_PRIVATE_KEY");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function createFirstAdmin() {
  const cedula = "12345";
  const pin = "1234";
  const name = "Admin Inicial";

  console.log(`⏳ Creando usuario administrador: ${name} (ID: ${cedula})...`);

  try {
    const pinHash = await bcrypt.hash(pin, 10);
    
    // Crear el documento en Firestore
    const userRef = db.collection("users").doc("admin_root");
    await userRef.set({
      uid: "admin_root",
      displayName: name,
      cedula: cedula,
      email: "admin@campus.com",
      department: "produccion",
      role: "jefatura",
      puesto: "Administrador de Sistema",
      pinHash: pinHash,
      isActive: true,
      failedPinAttempts: 0,
      pinLockedUntil: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: null,
    });

    console.log("✅ ¡USUARIO CREADO EXITOSAMENTE!");
    console.log("-----------------------------------");
    console.log(`Cédula: ${cedula}`);
    console.log(`PIN: ${pin}`);
    console.log("-----------------------------------");
    console.log("Ya puedes ir a http://localhost:3001 e ingresar.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error al crear el usuario:", error);
    process.exit(1);
  }
}

createFirstAdmin();

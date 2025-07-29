const admin = require("./firebaseAdmin");

async function testConnection() {
  try {
    const users = await admin.auth().listUsers(1); // obtiene 1 usuario
    console.log("Conexión a Firebase OK ✅", users.users[0]?.email || "Sin usuarios");
  } catch (error) {
    console.error("❌ Error al conectar a Firebase:", error.message);
  }
}

testConnection();
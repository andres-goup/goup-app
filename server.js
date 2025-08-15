import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";

const app = express();
const port = process.env.PORT || 8080;

// Catch-all → redirige todas las rutas a index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
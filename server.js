import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";

const app = express();
const port = process.env.PORT || 8080;

// __dirname en ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
// app.use(compression());
// app.use(helmet());
// app.use(morgan("dev"));

// Carpeta estática (dist de Vite)
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Catch-all -> redirige todas las rutas a index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
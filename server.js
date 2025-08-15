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

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
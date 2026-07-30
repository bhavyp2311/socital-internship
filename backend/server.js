import "dotenv/config";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import authRouter from "./routes/auth.routes.js";
import inviteRouter from "./routes/invite.routes.js";
import adminRouter from "./routes/admin.routes.js";
import areaAdminRouter from "./routes/area-admin.routes.js";
import workerRouter from "./routes/worker.routes.js";
import citizenRouter from "./routes/citizen.routes.js";
import notificationsRouter from "./routes/notifications.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use("/frontend", express.static(join(__dirname, "..", "frontend")));

app.get("/", (req, res) => {
  res.json({ message: "API is running", status: "ok" });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.use("/api/auth", authRouter);
app.use("/api/invites", inviteRouter);
app.use("/api/admin", adminRouter);
app.use("/api/area-admin", areaAdminRouter);
app.use("/api/worker", workerRouter);
app.use("/api/citizen", citizenRouter);
app.use("/api/notifications", notificationsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

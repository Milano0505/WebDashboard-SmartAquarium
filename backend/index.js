import cors from "cors";
import "dotenv/config";
import express from "express";
import aquariumRoutes from "./routes/aquariums.js";
import authRoutes from "./routes/auth.js";
import hardwareRoutes from "./routes/hardware.js";
import userRoutes from "./routes/users.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

// ---------- Middleware ----------

// Development: semua origin boleh. Production: hanya FRONTEND_ORIGIN
app.use(
    cors({
        origin(origin, callback) {
            if (!origin || process.env.NODE_ENV !== "production" || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error("This origin is not allowed by the API CORS policy."));
        },
    }),
);
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
    req.body ||= {};
    next();
});

// ---------- Route ----------

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/aquariums", aquariumRoutes);
app.use("/api/hardware", hardwareRoutes);

// ---------- Error handler ----------

app.use((req, res) => res.status(404).json({ message: "API endpoint was not found." }));

// Error dengan `status` (mis. 400) dikirim apa adanya; error lain jadi 500
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status >= 500) console.error("API request failed:", error.message);
    return res.status(status).json({
        message: status >= 500 ? "An unexpected server error occurred." : error.message,
    });
});

app.listen(port, () => {
    console.log(`Smart Aquarium API listening on port ${port}`);
});

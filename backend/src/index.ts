import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import channelRoutes from "./routes/channel.js";
import analyticsRoutes from "./routes/analytics.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  "https://wasla-alpha.vercel.app",
  "https://wasla-backend-chi.vercel.app",
  /^https:\/\/wasla-[a-z0-9-]+\.vercel\.app$/,
];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin),
      )
    ) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

app.use("/api", channelRoutes);
app.use("/api/analytics", analyticsRoutes);

export default app;

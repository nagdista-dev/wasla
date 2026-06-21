import express from "express";
import compression from "compression";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import channelRoutes from "./routes/channel.js";
import analyticsRoutes from "./routes/analytics.js";
import shareRoutes from "./routes/share.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

app.use(compression());

const cacheMiddleware = (duration: number) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${duration}, s-maxage=${duration}`);
  }
  next();
};

app.use(cors(corsOptions));
app.use(express.json());

const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath, { maxAge: '1d' }));

app.get("/", cacheMiddleware(300), (req, res) => {
  res.json({ message: "Hello from backend!" });
});

app.get("/api/health", cacheMiddleware(60), (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

app.use("/api", cacheMiddleware(300), channelRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/", shareRoutes);

export default app;

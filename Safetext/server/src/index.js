import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { appConfig } from "./config/app.config.js";
import apiRoutes from "./routes/api.routes.js";
import publicV1Routes from "./routes/public.v1.routes.js";
import { registerChatSockets } from "./sockets/chat.socket.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

const corsOrigins = [
  appConfig.clientOrigin,
  ...appConfig.publicApiCorsExtraOrigins,
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (appConfig.publicApiCorsAllowAll) {
        cb(null, true);
        return;
      }
      if (!origin) {
        cb(null, true);
        return;
      }
      cb(null, corsOrigins.includes(origin));
    },
    credentials: !appConfig.publicApiCorsAllowAll,
  })
);

app.use(express.json({ limit: 128 * 1024 }));

app.get("/", (_req, res) => {
  res.type("application/json").json({
    service: "Safetext-api",
    appName: appConfig.appName,
    client: appConfig.clientOrigin,
    health: "/v1/health",
    moderations: "POST /v1/moderations",
  });
});

app.use("/v1", publicV1Routes);
app.use("/api", apiRoutes);

app.use(errorMiddleware);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: appConfig.clientOrigin, methods: ["GET", "POST"] },
});

registerChatSockets(io);

server.listen(appConfig.port, () => {
  if (!appConfig.publicApiKeys.length) {
    console.warn(
      "[public-api] PUBLIC_API_KEYS is empty — /v1/moderations is open (set keys for production)."
    );
  }
  console.log(
    `${appConfig.appName} API on :${appConfig.port} — web UI: ${appConfig.clientOrigin}`
  );
});

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @param {string} mode */
function resolveBranding(mode) {
  const env = loadEnv(mode, __dirname, "");
  const name = String(env.VITE_APP_NAME || "").trim() || "Safetext";
  const tagline =
    String(env.VITE_APP_TAGLINE || "").trim() || "Community safety & moderation";
  return { name, tagline };
}

/** @param {string} mode */
function brandingOpenApiPlugin(mode) {
  const { name } = resolveBranding(mode);
  return {
    name: "branding-openapi",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/openapi.yaml") {
          next();
          return;
        }
        try {
          const filePath = path.join(__dirname, "public/openapi.yaml");
          const body = fs.readFileSync(filePath, "utf8").replaceAll("__APP_NAME__", name);
          res.setHeader("Content-Type", "application/yaml; charset=utf-8");
          res.end(body);
        } catch (err) {
          next(err);
        }
      });
    },
    closeBundle() {
      const distFile = path.join(__dirname, "dist/openapi.yaml");
      if (!fs.existsSync(distFile)) return;
      const body = fs.readFileSync(distFile, "utf8").replaceAll("__APP_NAME__", name);
      fs.writeFileSync(distFile, body);
    },
  };
}

export default defineConfig(({ mode }) => {
  const { name, tagline } = resolveBranding(mode);
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "branding-index-html",
        transformIndexHtml(html) {
          return html
            .replaceAll("__BRAND_NAME__", name)
            .replaceAll("__BRAND_TAGLINE__", tagline);
        },
      },
      brandingOpenApiPlugin(mode),
    ],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/v1": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
  };
});

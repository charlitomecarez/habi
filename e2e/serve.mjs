// Serves the web export. Any path that is not a file gets index.html, so deep links load the app.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const [root = "dist", port = "8090"] = process.argv.slice(2);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(root, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
  res.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
  createReadStream(file).pipe(res);
}).listen(Number(port));

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const port = 8877;
const root = path.dirname(fileURLToPath(import.meta.url));

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
]);

function isInsideRoot(candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", `http://${host}:${port}`);
    const pathname = decodeURIComponent(requestUrl.pathname);
    const relativePath = pathname === "/" ? "imasora-world-3d-dev.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(root, relativePath);

    if (!isInsideRoot(filePath) || !(await stat(filePath)).isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("404 Not Found");
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    });
    response.end(body);
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 500;
    response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(status === 404 ? "404 Not Found" : "500 Internal Server Error");
  }
});

server.listen(port, host, () => {
  console.log(`Imasora World 3D dev server: http://${host}:${port}/imasora-world-3d-dev.html`);
});

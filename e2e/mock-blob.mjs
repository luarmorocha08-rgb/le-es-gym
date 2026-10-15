// Servidor HTTP que imita a API do Vercel Blob, usado SOMENTE nos testes e2e
// (E2E_BLOB_MOCK=1). O app em teste aponta para ele via VERCEL_BLOB_API_URL
// (servidor) e NEXT_PUBLIC_VERCEL_BLOB_API_URL (navegador, definido no build).
import { randomBytes } from "node:crypto";
import http from "node:http";

const port = Number(process.env.MOCK_BLOB_PORT ?? 3298);
const store = process.env.MOCK_BLOB_STORE ?? "e2estore";
const requests = [];

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, PUT, POST, OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "*",
};

/** Lê as regras gravadas no token de envio do cliente (como faz o serviço real). */
function clientRules(authorization) {
  const token = String(authorization ?? "").replace(/^Bearer /, "");
  const match = /^vercel_blob_client_[^_]+_(.+)$/.exec(token);
  if (!match) return null;
  try {
    const decoded = Buffer.from(match[1], "base64").toString();
    return JSON.parse(Buffer.from(decoded.slice(decoded.indexOf(".") + 1), "base64").toString());
  } catch {
    return null;
  }
}

function send(res, status, body) {
  res.writeHead(status, { ...cors, "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
    if (req.method === "GET" && url.pathname === "/__requests") return send(res, 200, requests);

    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      if (req.method === "PUT" && url.pathname === "/") {
        let pathname = url.searchParams.get("pathname") ?? "";
        const rules = clientRules(req.headers.authorization);
        const contentType = String(req.headers["x-content-type"] ?? req.headers["content-type"] ?? "application/octet-stream");
        if (rules?.pathname && rules.pathname !== pathname) return send(res, 403, { error: { code: "forbidden", message: "pathname" } });
        if (rules?.allowedContentTypes && !rules.allowedContentTypes.includes(contentType)) {
          return send(res, 400, { error: { code: "content_type_not_allowed", message: contentType } });
        }
        if (rules?.maximumSizeInBytes && body.length > rules.maximumSizeInBytes) {
          return send(res, 400, { error: { code: "file_too_large", message: String(body.length) } });
        }
        if (req.headers["x-add-random-suffix"] === "1" || rules?.addRandomSuffix) {
          const dot = pathname.lastIndexOf(".");
          const suffix = randomBytes(6).toString("hex");
          pathname = dot > 0 ? `${pathname.slice(0, dot)}-${suffix}${pathname.slice(dot)}` : `${pathname}-${suffix}`;
        }
        requests.push({ op: "put", pathname, contentType, size: body.length, auth: Boolean(req.headers.authorization) });
        const publicUrl = `https://${store}.public.blob.vercel-storage.com/${pathname}`;
        return send(res, 200, { url: publicUrl, downloadUrl: `${publicUrl}?download=1`, pathname, contentType, contentDisposition: "inline", etag: '"e2e"' });
      }
      if (req.method === "POST" && url.pathname === "/delete") {
        const { urls } = JSON.parse(body.toString() || "{}");
        requests.push({ op: "delete", urls });
        return send(res, 200, {});
      }
      send(res, 404, { error: { code: "not_found", message: "rota não simulada" } });
    });
  })
  .listen(port, "127.0.0.1", () => console.log(`mock blob em http://127.0.0.1:${port}`));

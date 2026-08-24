// Деплой статики из dist/ в Yandex Object Storage (S3-совместимый API).
// Запускается автоматически после `npm run build` (postbuild).
// Нужны переменные окружения:
//   YC_BUCKET, YC_ACCESS_KEY_ID, YC_SECRET_ACCESS_KEY
//   (опционально: YC_ENDPOINT, YC_REGION)
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.YC_BUCKET;
const KEY = process.env.YC_ACCESS_KEY_ID;
const SECRET = process.env.YC_SECRET_ACCESS_KEY;
const ENDPOINT = process.env.YC_ENDPOINT || "https://storage.yandexcloud.net";
const REGION = process.env.YC_REGION || "ru-central1";
const DIST = path.resolve("dist");

if (!BUCKET || !KEY || !SECRET) {
  console.log("[deploy] YC_BUCKET / YC_ACCESS_KEY_ID / YC_SECRET_ACCESS_KEY не заданы — деплой пропущен.");
  process.exit(0);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: KEY, secretAccessKey: SECRET },
});

const files = await walk(DIST);
for (const file of files) {
  const key = path.relative(DIST, file).split(path.sep).join("/");
  const ext = path.extname(file).toLowerCase();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: await readFile(file),
      ContentType: MIME[ext] || "application/octet-stream",
      CacheControl: ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    }),
  );
  console.log("[deploy] uploaded", key);
}
console.log(`[deploy] готово: ${files.length} файлов → ${BUCKET}`);

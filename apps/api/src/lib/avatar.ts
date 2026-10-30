import { mkdir, writeFile } from "fs/promises";
import path from "path";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function getUploadsRoot(): string {
  return path.join(process.cwd(), "uploads");
}

export async function saveUserAvatar(
  userId: string,
  contentType: string,
  base64: string,
): Promise<string> {
  const ext = EXT[contentType];
  if (!ext) throw new Error("Unsupported image type");
  const dir = path.join(getUploadsRoot(), "avatars");
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > 700_000) {
    throw new Error("Image too large");
  }
  const filename = `${userId}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/avatars/${filename}`;
}

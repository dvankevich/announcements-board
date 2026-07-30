import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Спочатку завантажуємо .env
dotenv.config({ path: path.join(__dirname, ".env") });

// 2. Тільки після цього імпортуємо cloudinary
const { default: cloudinary } = await import("./src/config/cloudinary.ts");

console.log("Cloudinary config check:");
console.log("CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API_KEY:", process.env.CLOUDINARY_API_KEY ? "exists" : "MISSING");
console.log("API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "exists" : "MISSING");

const upload = multer({ dest: path.join(__dirname, "tmp") });

const app = express();

app.get("/", (_req: Request, res: Response) => {
  res.send(`
    <h2>Upload Image (Cloudinary Test)</h2>
    <form action="/upload" method="POST" enctype="multipart/form-data">
      <input type="file" name="image" accept="image/*" required />
      <button type="submit">Upload</button>
    </form>
  `);
});

app.post(
  "/upload",
  upload.single("image"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "announcements",
      });

      res.status(201).json({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      });
    } catch (error) {
      console.error("Cloudinary error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }
  },
);

app.listen(3001, () => {
  console.log("Test server running on http://localhost:3001");
});

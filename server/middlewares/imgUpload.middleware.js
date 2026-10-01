import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STUDENT_DIR = path.join(__dirname, "..", "uploads", "students");

const ALLOWED = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: STUDENT_DIR,
  filename: (req, file, cb) =>
    cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(new Error("INVALID TYPE"));
    cb(null, true);
  },
});

function uploadStudentToDisk(req, res, next) {
  upload.single("studentImage")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ message: "Image must be 2 MB or smaller" });
      }
      if (err.message === "INVALID_TYPE") {
        return res
          .status(400)
          .json({ message: "Only JPG, PNG or WEBP allowed" });
      }

      console.error("MIDDLEWARE ERROR : faceUpload.middleware\n", err);
      return res.status(500).json({
        message: "INTERNAL SERVER ERROR",
      });
    }

    next();
  });
}

export { uploadStudentToDisk, STUDENT_DIR };

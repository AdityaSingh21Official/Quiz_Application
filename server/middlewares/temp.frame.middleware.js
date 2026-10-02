import Multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMP_DIR = path.join(__dirname, "..", "uploads", "students");

const ALLOWED = {
  "image/jpeg": ".jpg",
};

const storage = Multer.diskStorage({
  destination: TEMP_DIR,
  filename: (req, file, cb) =>
    cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]),
});

const upload = Multer({
  storage,
  limits: { fileSize: 200 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(new Error("INVALID_TYPE"));
    cb(null, true);
  },
});

function uploadFrameToDisk(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ message: "Image must be 200KB or smaller" });
      }
      if (err.message === "INVALID_TYPE") {
        return res.status(400).json({ message: "Only .jpg Allowed" });
      }

      console.log("MIDDLEWARE ERROR : temp.frame.middleware\n" + err);
      return res.status(500).json({ message: "INTERAL SERVER ERROR" });
    }

    next();
  });
}

export { uploadFrameToDisk, TEMP_DIR };

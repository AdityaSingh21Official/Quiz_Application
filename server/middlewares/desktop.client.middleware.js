import crypto from "crypto";
import { config } from "dotenv";

config();

const MAX_SKEW_MS = 5 * 60 * 1000;

function requireDesktopClient(req, res, next) {
  if (process.env.REQUIRE_DESKTOP !== "true") return next();

  const key = process.env.DESKTOP_APP_KEY;
  const ts = req.get("X-Quiz-Ts");
  const sig = req.get("X-Quiz-Sig");

  if (!key || !ts || !sig || Math.abs(Date.now() - Number(ts)) > MAX_SKEW_MS) {
    return res
      .status(403)
      .json({ message: "Please use the Quiz Desktop app to take quizzes" });
  }

  const pathname = req.originalUrl.split("?")[0];
  const expected = crypto
    .createHmac("sha256", key)
    .update(`${ts}.${req.method}.${pathname}`)
    .digest();
  const given = Buffer.from(sig, "hex");

  if (
    given.length !== expected.length ||
    !crypto.timingSafeEqual(given, expected)
  ) {
    return res
      .status(403)
      .json({ message: "Please use the Quiz Desktop app to take quizzes" });
  }

  next();
}

export { requireDesktopClient };

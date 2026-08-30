import jwt from "jsonwebtoken";

function authorise(req, res, next) {
  try {
    const authToken = req.headers.Authorization || req.headers["authorization"];

    if (!authToken) {
      return res.status(401).json({
        message: "No Authorization",
      });
    }

    const token = authToken.split(" ")[1];

    const deConstruct = jwt.verify(token, process.env.JWT_SECRET);

    req.user = deConstruct;
    next();
  } catch (error) {
    console.log("\n" + error + "\n");

    return res.status(401).json({
      message: "Invalid or Expired Token",
    });
  }
}

export { authorise };

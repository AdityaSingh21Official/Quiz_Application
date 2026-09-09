function isStudentRole(req, res, next) {
  try {
    const role = req.user.role;

    if (!role || role.length === 0 || role !== "student") {
      return res.status(403).json({
        messgae: "User not allowed",
      });
    }

    next();
  } catch (error) {
    console.log("MIDDLEWARE ERROR : isStudentRole.middleware " + error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export { isStudentRole };

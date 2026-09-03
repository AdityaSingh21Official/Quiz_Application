function isTeacher(req, res, next) {
  try {
    const id = req.user.role;

    if (!id || id !== "teacher") {
      return res.status(403).json({
        message: "User not allowed",
      });
    }

    next();
  } catch (error) {
    console.log(
      "\nMIDDLEWARE ERROR : teacherRoleRequired.middleware\n" + error,
    );

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

export { isTeacher };

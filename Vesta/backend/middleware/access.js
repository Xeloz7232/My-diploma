const checkRole = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Ошибка доступа" });
  }
  next();
};

module.exports = checkRole;

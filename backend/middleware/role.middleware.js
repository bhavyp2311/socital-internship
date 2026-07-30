/**
 * middleware/role.middleware.js - Gates routes to specific roles.
 * Always use AFTER requireAuth so req.user is already set.
 *
 * Usage:
 *   router.post('/invite', requireAuth, requireRole('super_admin','admin','area_admin'), ...)
 */

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of: ${allowedRoles.join(", ")}`,
      });
    }
    next();
  };
}
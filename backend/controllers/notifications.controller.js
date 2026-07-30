import * as notificationsService from "../services/notifications.service.js";

function handleError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || "Something went wrong" });
}

export async function getNotifications(req, res) {
  try {
    const { is_read, priority, type, page, limit } = req.query;
    const data = await notificationsService.getNotifications(req.user.sub, {
      is_read, priority, type, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
    });
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function markRead(req, res) {
  try {
    await notificationsService.markRead(req.params.id, req.user.sub);
    res.json({ success: true, message: "Marked as read" });
  } catch (err) { handleError(res, err); }
}

export async function markAllRead(req, res) {
  try {
    await notificationsService.markAllRead(req.user.sub);
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) { handleError(res, err); }
}

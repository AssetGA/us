import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAuth } from "../middleware/context.js";
import { AppError, sendError } from "../lib/errors.js";
import { paramId } from "../lib/params.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const items = await req.appLocals.collections.notifications
      .find({
        userId: req.user!._id,
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    res.json({
      items: items.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        body: n.body,
        readAt: n.readAt,
        meta: n.meta,
        createdAt: n.createdAt,
      })),
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/:id/read", requireAuth, async (req, res) => {
  try {
    const pid = paramId(req.params.id);
    if (!ObjectId.isValid(pid)) throw new AppError(400, "Invalid id");
    await req.appLocals.collections.notifications.updateOne(
      { _id: new ObjectId(pid), userId: req.user!._id },
      { $set: { readAt: new Date() } },
    );
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

export default router;

import { Router } from "express";
import { requireAuth } from "../middleware/context.js";
import { assertPermission } from "../services/request-access.js";
import { sendError } from "../lib/errors.js";

const router = Router();

router.get("/requests", requireAuth, async (req, res) => {
  try {
    assertPermission(req.user!, "reports:read");
    const { collections } = req.appLocals;
    const pipeline = [
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ];
    const byStatus = await collections.serviceRequests.aggregate(pipeline).toArray();
    const total = await collections.serviceRequests.countDocuments({});
    res.json({
      total,
      byStatus: Object.fromEntries(byStatus.map((r) => [r._id, r.count])),
    });
  } catch (e) {
    sendError(res, e);
  }
});

export default router;

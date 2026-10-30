import { Router } from "express";
import { requireAuth } from "../middleware/context.js";
import { assertPermission } from "../services/request-access.js";
import { sendError } from "../lib/errors.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    assertPermission(req.user!, "requests:assign");
    const items = await req.appLocals.collections.contractors
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();
    res.json({
      items: items.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        contactEmail: c.contactEmail,
        allowedCategoryIds: c.allowedCategoryIds.map((id) => id.toString()),
      })),
    });
  } catch (e) {
    sendError(res, e);
  }
});

export default router;

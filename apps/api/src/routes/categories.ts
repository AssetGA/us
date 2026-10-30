import { Router } from "express";
import { sendError } from "../lib/errors.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const items = await req.appLocals.collections.categories
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .toArray();
    res.json({
      items: items.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        slug: c.slug,
      })),
    });
  } catch (e) {
    sendError(res, e);
  }
});

export default router;

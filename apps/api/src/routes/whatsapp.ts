import { Router } from "express";
import { sendError } from "../lib/errors.js";

const router = Router();

/** Верификация webhook Meta WhatsApp Cloud API */
router.get("/webhook", (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const expected = req.appLocals.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (mode === "subscribe" && token && expected && token === expected && challenge) {
      res.status(200).send(String(challenge));
      return;
    }
    res.sendStatus(403);
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/webhook", (req, res) => {
  res.sendStatus(200);
});

export default router;

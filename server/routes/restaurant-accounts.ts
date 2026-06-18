import express from "express";

const router = express.Router();

// Restaurant accounts routes removed - single-store Tamtom project
router.all("*", (_req, res) => {
  res.status(410).json({ error: "Restaurant accounts API removed. Tamtom is a single-store app." });
});

export default router;

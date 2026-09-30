const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getRecommendationsForBuyer } = require("../services/recommendationEngine");

const router = express.Router();

// GET /api/recommendations  (buyer only) -- content-based, cosine-similarity feed
router.get("/", requireAuth, requireRole("buyer"), async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const recs = await getRecommendationsForBuyer(req.user.id, limit);
    res.json(recs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

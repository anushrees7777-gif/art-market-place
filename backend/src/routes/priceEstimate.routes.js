const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const User = require("../models/User");
const { estimatePrice } = require("../services/priceEstimator");
const Artwork = require("../models/Artwork");

const router = express.Router();

// POST /api/price-estimate  (artist only) -- called live from the upload form,
// before the artwork is even saved, so the artist sees a suggested price
// while they're still filling in category/medium/dimensions.
router.post("/", requireAuth, requireRole("artist"), async (req, res) => {
  try {
    const { category, medium, widthCm, heightCm } = req.body;
    if (!category || !medium) {
      return res.status(400).json({ error: "category and medium are required" });
    }
    const artist = await User.findById(req.user.id).lean();
    if (!Artwork.CATEGORIES.includes(category) || !Artwork.MEDIUMS.includes(medium)) {
      return res.status(400).json({ error: "invalid category or medium" });
    }

    const estimate = estimatePrice({
      category,
      medium,
      widthCm: Number(widthCm) || undefined,
      heightCm: Number(heightCm) || undefined,
      artistReputationScore: artist?.reputationScore || 0,
    });

    res.json(estimate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

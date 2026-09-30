const express = require("express");
const Interaction = require("../models/Interaction");
const Artwork = require("../models/Artwork");
const { requireAuth, requireRole } = require("../middleware/auth");
const { updateTasteVector } = require("../services/recommendationEngine");
const { recomputeDemandScore, recomputeArtistReputation } = require("../services/reputationEngine");

const router = express.Router();

const COUNTER_FIELD = { like: "likeCount", save: "saveCount", follow_artist: "followThroughCount" };

// POST /api/interactions  { artworkId, type: "view"|"like"|"save"|"follow_artist" }
router.post("/", requireAuth, requireRole("buyer"), async (req, res) => {
  try {
    const { artworkId, type } = req.body;
    if (!["view", "like", "save", "follow_artist"].includes(type)) {
      return res.status(400).json({ error: "invalid interaction type" });
    }

    await Interaction.create({ buyer: req.user.id, artwork: artworkId, type });

    if (COUNTER_FIELD[type]) {
      await Artwork.findByIdAndUpdate(artworkId, { $inc: { [COUNTER_FIELD[type]]: 1 } });
    }

    // Update both the buyer's recommendation profile and the artwork/artist's
    // demand & reputation scores off the same event -- this is the pipeline
    // described on the "How Recommendations & Reputation Work" slide.
    await updateTasteVector(req.user.id, artworkId, type);
    const artwork = await recomputeDemandScore(artworkId);
    if (artwork) await recomputeArtistReputation(artwork.artist);

    res.status(201).json({ ok: true, demandScore: artwork?.demandScore, auctionEligible: artwork?.auctionEligible });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

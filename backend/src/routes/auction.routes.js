const express = require("express");
const Artwork = require("../models/Artwork");
const Bid = require("../models/Bid");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/auctions/:artworkId/start  (artist only, must own the piece, must be auction-eligible)
router.post("/:artworkId/start", requireAuth, requireRole("artist"), async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.artworkId);
    if (!artwork) return res.status(404).json({ error: "Not found" });
    if (String(artwork.artist) !== req.user.id) return res.status(403).json({ error: "Not your listing" });
    if (!artwork.auctionEligible) {
      return res.status(400).json({ error: "Artwork has not crossed the demand threshold yet" });
    }
    artwork.status = "in_auction";
    await artwork.save();
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auctions/:artworkId  -- current highest bid + history (REST fallback; live updates via Socket.IO)
router.get("/:artworkId", async (req, res) => {
  try {
    const bids = await Bid.find({ artwork: req.params.artworkId })
      .sort({ amount: -1 })
      .limit(20)
      .populate("bidder", "name");
    res.json({ highestBid: bids[0] || null, recentBids: bids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

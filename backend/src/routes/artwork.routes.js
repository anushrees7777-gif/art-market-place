const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Artwork = require("../models/Artwork");
const { requireAuth, requireRole } = require("../middleware/auth");
const { buildFeatureVector } = require("../services/artworkFeatures");
const { computePerceptualHash, findLikelyDuplicate } = require("../services/duplicateCheck");
const { recomputeArtistReputation } = require("../services/reputationEngine");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

// POST /api/artworks  (artist only) -- upload + AI analysis + duplicate check
router.post(
  "/",
  requireAuth,
  requireRole("artist"),
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "image file is required" });
      const { title, story, category, medium, price, widthCm, heightCm } = req.body;
      if (!title || !category || !medium || !price) {
        return res.status(400).json({ error: "title, category, medium, price are required" });
      }

      const imageBuffer = fs.readFileSync(req.file.path);
      const perceptualHash = await computePerceptualHash(imageBuffer);
      const duplicate = await findLikelyDuplicate(perceptualHash);

      const { featureVector, dominantColors } = await buildFeatureVector({
        category,
        medium,
        price: Number(price),
        imageBuffer,
      });

      const artwork = await Artwork.create({
        artist: req.user.id,
        title,
        story,
        category,
        medium,
        price: Number(price),
        dimensions: { widthCm: Number(widthCm) || undefined, heightCm: Number(heightCm) || undefined },
        imageUrl: `/uploads/${req.file.filename}`,
        perceptualHash,
        dominantColors,
        featureVector,
        verificationStatus: duplicate ? "flagged_duplicate" : "pending",
      });

      res.status(201).json({
        artwork,
        duplicateWarning: duplicate
          ? `This image looks very similar to an existing listing ("${duplicate.title}"). It has been flagged for admin review instead of going live immediately.`
          : null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/artworks  -- browse + basic search/filter (Phase 1 requirement)
router.get("/", async (req, res) => {
  try {
    const { q, category, medium, minPrice, maxPrice, sort } = req.query;
    const filter = { status: { $in: ["listed", "in_auction"] } };
    if (category) filter.category = category;
    if (medium) filter.medium = medium;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (q) filter.title = { $regex: q, $options: "i" };

    let query = Artwork.find(filter).populate("artist", "name reputationScore");
    if (sort === "demand") query = query.sort({ demandScore: -1 });
    else if (sort === "price_asc") query = query.sort({ price: 1 });
    else if (sort === "price_desc") query = query.sort({ price: -1 });
    else query = query.sort({ createdAt: -1 });

    const artworks = await query.limit(100);
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/artworks/:id  -- also increments the view counter (feeds demand score)
router.get("/:id", async (req, res) => {
  try {
    const artwork = await Artwork.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate("artist", "name reputationScore bio");
    if (!artwork) return res.status(404).json({ error: "Not found" });
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/artworks/:id/verify  (admin only) -- resolve a flagged duplicate
router.patch("/:id/verify", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { decision } = req.body; // "approved" | "rejected"
    const artwork = await Artwork.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: decision },
      { new: true }
    );
    if (artwork && decision === "approved") {
      await recomputeArtistReputation(artwork.artist);
    }
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

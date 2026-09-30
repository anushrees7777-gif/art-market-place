// Populates a freshly-started (in-memory or real) database with a couple of
// artists, a couple of buyers, some artworks with feature vectors, and a
// batch of interactions -- so `npm run seed` followed by browsing the API
// immediately shows non-empty recommendations, non-zero demand scores, and
// at least one auction-eligible artwork, instead of everything being blank
// on a brand new install.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Artwork = require("../models/Artwork");
const Interaction = require("../models/Interaction");
const { buildFeatureVector } = require("../services/artworkFeatures");
const { recomputeDemandScore, recomputeArtistReputation } = require("../services/reputationEngine");
const { updateTasteVector } = require("../services/recommendationEngine");

// A tiny solid-color PNG generated in-memory so the seed script needs no
// external image files or network access, while still exercising the real
// color-extraction + perceptual-hash pipeline.
const sharp = require("sharp");
async function swatch(hex) {
  const [r, g, b] = [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((h) => parseInt(h, 16));
  return sharp({ create: { width: 64, height: 64, channels: 3, background: { r, g, b } } })
    .png()
    .toBuffer();
}

async function run() {
  await connectDB();
  console.log("[seed] clearing existing collections...");
  await Promise.all([User.deleteMany({}), Artwork.deleteMany({}), Interaction.deleteMany({})]);

  const passwordHash = await bcrypt.hash("password123", 10);

  const [artistA, artistB, buyer1, buyer2] = await User.create([
    { name: "Meera Iyer", email: "meera@example.com", passwordHash, role: "artist", bio: "Oil painter, warm palettes." },
    { name: "Dev Sharma", email: "dev@example.com", passwordHash, role: "artist", bio: "Digital surrealist." },
    { name: "Buyer One", email: "buyer1@example.com", passwordHash, role: "buyer" },
    { name: "Buyer Two", email: "buyer2@example.com", passwordHash, role: "buyer" },
  ]);

  const specs = [
    { artist: artistA, title: "Evening Ochre", category: "Painting", medium: "Oil", price: 4500, widthCm: 60, heightCm: 80, color: "C97B3D" },
    { artist: artistA, title: "Terracotta Dusk", category: "Painting", medium: "Oil", price: 5200, widthCm: 70, heightCm: 90, color: "B5591F" },
    { artist: artistB, title: "Fractured Dream", category: "Digital Art", medium: "Digital", price: 1800, widthCm: 40, heightCm: 40, color: "3D4FC9" },
    { artist: artistB, title: "Neon Reverie", category: "Digital Art", medium: "Digital", price: 2200, widthCm: 40, heightCm: 40, color: "5D3DC9" },
  ];

  const artworks = [];
  for (const s of specs) {
    const imageBuffer = await swatch(s.color);
    const { featureVector, dominantColors } = await buildFeatureVector({
      category: s.category,
      medium: s.medium,
      price: s.price,
      imageBuffer,
    });
    const artwork = await Artwork.create({
      artist: s.artist._id,
      title: s.title,
      story: `A demo piece by ${s.artist.name}.`,
      category: s.category,
      medium: s.medium,
      price: s.price,
      dimensions: { widthCm: s.widthCm, heightCm: s.heightCm },
      imageUrl: "/uploads/demo-placeholder.png",
      featureVector,
      dominantColors,
      verificationStatus: "approved",
    });
    artworks.push(artwork);
  }

  // Buyer One likes/saves both of Meera's warm oil paintings heavily -> should
  // get the other warm painting recommended over the digital art pieces, and
  // push "Evening Ochre" past the auction-eligibility threshold.
  const heavyInteractions = [
    { buyer: buyer1, artwork: artworks[0], type: "view" },
    { buyer: buyer1, artwork: artworks[0], type: "like" },
    { buyer: buyer1, artwork: artworks[0], type: "save" },
    { buyer: buyer1, artwork: artworks[0], type: "follow_artist" },
    { buyer: buyer2, artwork: artworks[0], type: "view" },
    { buyer: buyer2, artwork: artworks[0], type: "like" },
    { buyer: buyer1, artwork: artworks[1], type: "view" },
    { buyer: buyer2, artwork: artworks[2], type: "view" },
    { buyer: buyer2, artwork: artworks[2], type: "like" },
  ];

  for (const i of heavyInteractions) {
    await Interaction.create({ buyer: i.buyer._id, artwork: i.artwork._id, type: i.type });
    await updateTasteVector(i.buyer._id, i.artwork._id, i.type);
    const counterField = { like: "likeCount", save: "saveCount", follow_artist: "followThroughCount" }[i.type];
    if (counterField) await Artwork.findByIdAndUpdate(i.artwork._id, { $inc: { [counterField]: 1 } });
    if (i.type === "view") await Artwork.findByIdAndUpdate(i.artwork._id, { $inc: { viewCount: 1 } });
  }

  for (const a of artworks) {
    const updated = await recomputeDemandScore(a._id);
    await recomputeArtistReputation(updated.artist);
  }

  console.log("[seed] done. Demo logins (password: password123):");
  console.log("  artist: meera@example.com   |  artist: dev@example.com");
  console.log("  buyer:  buyer1@example.com  |  buyer:  buyer2@example.com");
  console.log(`[seed] created ${artworks.length} artworks. Check GET /api/artworks?sort=demand`);
  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});

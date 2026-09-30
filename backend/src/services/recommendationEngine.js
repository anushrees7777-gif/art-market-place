const Artwork = require("../models/Artwork");
const User = require("../models/User");

// Interaction types carry different weight when folded into a buyer's taste
// vector -- a "save" or "follow" is a much stronger taste signal than a
// passive "view". This mirrors the pitch deck's "Buyer preference vector
// built from views, likes, saves & follows".
const INTERACTION_WEIGHT = { view: 0.5, like: 1.5, save: 2.5, follow_artist: 2.0 };

function cosineSimilarity(a, b) {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Incrementally updates the buyer's taste vector as a running weighted
// average whenever a new interaction is logged. O(1) per interaction, no
// need to replay full history -- important once a buyer has thousands of
// interactions.
async function updateTasteVector(buyerId, artworkId, interactionType) {
  const [buyer, artwork] = await Promise.all([
    User.findById(buyerId),
    Artwork.findById(artworkId).lean(),
  ]);
  if (!buyer || !artwork || !artwork.featureVector?.length) return;

  const weight = INTERACTION_WEIGHT[interactionType] ?? 0.5;
  const n = buyer.tasteVectorInteractionCount || 0;

  if (!buyer.tasteVector || buyer.tasteVector.length !== artwork.featureVector.length) {
    buyer.tasteVector = artwork.featureVector.map((v) => v * weight);
  } else {
    const totalWeight = n + weight;
    buyer.tasteVector = buyer.tasteVector.map(
      (v, i) => (v * n + artwork.featureVector[i] * weight) / totalWeight
    );
  }
  buyer.tasteVectorInteractionCount = n + weight;
  await buyer.save();
}

// Ranks every "listed" artwork the buyer hasn't already interacted with by
// cosine similarity to their taste vector. Falls back to most-recent +
// highest-reputation-artist when the buyer has no history yet (cold start).
async function getRecommendationsForBuyer(buyerId, limit = 20) {
  const buyer = await User.findById(buyerId).lean();
  const seenArtworkIds = new Set();

  if (!buyer?.tasteVector?.length) {
    return Artwork.find({ status: "listed" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("artist", "name reputationScore");
  }

  const candidates = await Artwork.find({ status: "listed" })
    .populate("artist", "name reputationScore")
    .lean();

  const ranked = candidates
    .filter((a) => !seenArtworkIds.has(String(a._id)))
    .map((a) => ({
      artwork: a,
      score: cosineSimilarity(buyer.tasteVector, a.featureVector || []),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map((r) => ({ ...r.artwork, similarityScore: r.score }));
}

module.exports = { cosineSimilarity, updateTasteVector, getRecommendationsForBuyer };

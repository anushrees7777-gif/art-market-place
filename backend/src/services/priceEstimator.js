// --- Suggested Starting Price ---
// This closes the "No Price Discovery" gap from the pitch deck's problem
// slide, and is directly inspired by Nho & Park's CS230 paper "The Art of
// Predicting Art Auction Price": they fuse numeric/textual features
// (category, medium, size, artist track record) with image features to
// predict a hammer price, finding the numeric features alone already beat a
// linear baseline (MLP R^2 0.49 vs Linear 0.42 in their Table 2), with image
// features adding a further boost only when fused with the numeric side.
//
// A full trained CNN+MLP fusion needs thousands of labeled historical sales
// (their dataset: 7,755 auctions) which a new marketplace won't have on day
// one. So this ships as a transparent, explainable weighted heuristic over
// the same *categories* of feature their numeric branch used -- category,
// medium, size, and (in place of "auction house estimate") the artist's
// platform reputation score -- and is intentionally isolated behind one
// function so it can be swapped for a trained regression model (e.g.
// scikit-learn / TensorFlow.js) once enough completed sales exist in the
// `Bid`/`Artwork` collections to fit one, without touching any caller.

const CATEGORY_BASE = {
  Painting: 6000,
  Photography: 3500,
  "Digital Art": 2500,
  Sculpture: 9000,
};

const MEDIUM_MULTIPLIER = {
  Oil: 1.3,
  Acrylic: 1.1,
  Watercolor: 0.9,
  Charcoal: 0.8,
  Digital: 0.9,
  "Mixed Media": 1.15,
  Other: 1.0,
};

function sizeFactor(widthCm, heightCm) {
  if (!widthCm || !heightCm) return 1.0;
  const areaM2 = (widthCm / 100) * (heightCm / 100);
  // diminishing returns on size via sqrt, capped so a huge canvas doesn't blow up the estimate
  return Math.min(1 + Math.sqrt(areaM2) * 0.4, 3.0);
}

// Reputation acts the way the paper's "auction house pre-sale estimate"
// acted for the benchmark model: the single strongest prior signal. A brand
// new artist (reputationScore 0) gets multiplier 1.0; a well-established one
// can roughly double their base estimate.
function reputationFactor(reputationScore = 0) {
  return 1 + Math.min(reputationScore, 100) / 100;
}

function estimatePrice({ category, medium, widthCm, heightCm, artistReputationScore }) {
  const base = CATEGORY_BASE[category] ?? 4000;
  const mediumMult = MEDIUM_MULTIPLIER[medium] ?? 1.0;
  const sizeMult = sizeFactor(widthCm, heightCm);
  const repMult = reputationFactor(artistReputationScore);

  const point = base * mediumMult * sizeMult * repMult;
  return {
    suggestedPrice: Math.round(point / 50) * 50, // round to nearest 50
    range: { low: Math.round((point * 0.75) / 50) * 50, high: Math.round((point * 1.35) / 50) * 50 },
    factors: { base, mediumMult, sizeMult, repMult },
    method: "weighted-heuristic-v1",
    note:
      "Transparent estimate from category/medium/size/artist-reputation. Swap for a trained regression model (see services/priceEstimator.js header) once you have enough completed sales.",
  };
}

module.exports = { estimatePrice };

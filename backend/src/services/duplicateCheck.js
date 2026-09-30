const sharp = require("sharp");
const Artwork = require("../models/Artwork");

// --- Perceptual hashing (aHash) ---
// This is the real algorithm behind the pitch deck's "Duplicate-Image Check":
// resize to 8x8 grayscale, threshold each pixel against the mean brightness,
// and pack the result into a 64-bit hex hash. Two images of the *same*
// painting (even re-compressed, resized, or lightly cropped) land on hashes
// with a small Hamming distance, unlike a naive md5/sha256 of the file bytes
// which changes completely for any re-encode.
async function computePerceptualHash(imageBuffer) {
  const { data } = await sharp(imageBuffer)
    .resize(8, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Array.from(data);
  const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;

  let hash = "";
  let nibble = 0;
  pixels.forEach((p, i) => {
    nibble = (nibble << 1) | (p >= mean ? 1 : 0);
    if (i % 4 === 3) {
      hash += nibble.toString(16);
      nibble = 0;
    }
  });
  return hash; // 16 hex chars = 64 bits
}

function hammingDistanceHex(hexA, hexB) {
  if (hexA.length !== hexB.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < hexA.length; i++) {
    const xor = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    dist += xor.toString(2).split("1").length - 1;
  }
  return dist;
}

// A Hamming distance <= 6 (out of 64 bits) is a strong signal of the same
// underlying image. This threshold is intentionally conservative; tune it
// against a labeled sample of near-duplicates before relying on it in prod.
const DUPLICATE_THRESHOLD = 6;

async function findLikelyDuplicate(perceptualHash) {
  const candidates = await Artwork.find({ perceptualHash: { $exists: true, $ne: null } })
    .select("_id title artist perceptualHash")
    .lean();

  let best = null;
  for (const c of candidates) {
    const dist = hammingDistanceHex(perceptualHash, c.perceptualHash);
    if (dist <= DUPLICATE_THRESHOLD && (best === null || dist < best.distance)) {
      best = { artworkId: c._id, title: c.title, artist: c.artist, distance: dist };
    }
  }
  return best; // null if nothing close enough
}

module.exports = { computePerceptualHash, hammingDistanceHex, findLikelyDuplicate, DUPLICATE_THRESHOLD };

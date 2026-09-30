const sharp = require("sharp");
const Artwork = require("../models/Artwork");

const { CATEGORIES, MEDIUMS } = Artwork.schema.statics
  ? { CATEGORIES: Artwork.CATEGORIES, MEDIUMS: Artwork.MEDIUMS }
  : {};

// Downsamples the image to a small grid and returns up to 3 dominant RGB
// colors via a lightweight k-means-style bucketing. This stands in for the
// CNN color/style features in the CS230 paper -- cheap enough to run
// synchronously at upload time, no GPU or pretrained model required.
async function extractDominantColors(imageBuffer, k = 3) {
  const { data, info } = await sharp(imageBuffer)
    .resize(32, 32, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = [];
  for (let i = 0; i < data.length; i += info.channels) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  // naive k-means, few iterations is plenty for a 32x32 sample
  let centroids = pixels.filter((_, i) => i % Math.floor(pixels.length / k) === 0).slice(0, k);
  for (let iter = 0; iter < 5; iter++) {
    const buckets = Array.from({ length: k }, () => []);
    for (const p of pixels) {
      let bestIdx = 0;
      let bestDist = Infinity;
      centroids.forEach((c, idx) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });
      buckets[bestIdx].push(p);
    }
    centroids = buckets.map((bucket, idx) =>
      bucket.length
        ? [
            Math.round(bucket.reduce((s, p) => s + p[0], 0) / bucket.length),
            Math.round(bucket.reduce((s, p) => s + p[1], 0) / bucket.length),
            Math.round(bucket.reduce((s, p) => s + p[2], 0) / bucket.length),
          ]
        : centroids[idx]
    );
  }
  return centroids;
}

function oneHot(value, options) {
  return options.map((opt) => (opt === value ? 1 : 0));
}

// Normalizes price into one of 5 bands (0..1) rather than using raw price,
// the same log/band trick the CS230 paper used to tame a skewed price
// distribution before feeding it into a model.
function priceBandVector(price) {
  const bands = [1000, 5000, 20000, 75000]; // INR thresholds, tune per market
  const idx = bands.filter((b) => price >= b).length; // 0..4
  return oneHot(idx, [0, 1, 2, 3, 4]);
}

async function buildFeatureVector({ category, medium, price, imageBuffer }) {
  const dominantColors = await extractDominantColors(imageBuffer, 3);
  const normalizedColors = dominantColors.flat().map((c) => c / 255);
  const categoryVec = oneHot(category, Artwork.CATEGORIES);
  const mediumVec = oneHot(medium, Artwork.MEDIUMS);
  const priceVec = priceBandVector(price);

  const featureVector = [...categoryVec, ...mediumVec, ...priceVec, ...normalizedColors];
  return { featureVector, dominantColors };
}

module.exports = { extractDominantColors, buildFeatureVector, priceBandVector };

const mongoose = require("mongoose");

const CATEGORIES = ["Painting", "Photography", "Digital Art", "Sculpture"];
const MEDIUMS = ["Oil", "Acrylic", "Watercolor", "Charcoal", "Digital", "Mixed Media", "Other"];

const ArtworkSchema = new mongoose.Schema(
  {
    artist: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    story: { type: String, default: "" },
    category: { type: String, enum: CATEGORIES, required: true },
    medium: { type: String, enum: MEDIUMS, required: true },
    dimensions: {
      widthCm: Number,
      heightCm: Number,
    },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, required: true },

    // --- AI Artwork Analysis (Core Module #2 from the pitch deck) ---
    // A numeric feature vector built at upload time from category, medium,
    // dominant color palette (extracted from the image) and price band.
    // This is the "textual/numerical feature" idea from the CS230 art-price
    // paper, but used for similarity ranking instead of price regression.
    dominantColors: { type: [[Number]], default: [] }, // up to 3 RGB triples
    featureVector: { type: [Number], default: [] },

    // --- Trust & Verification ---
    perceptualHash: { type: String, index: true }, // see services/duplicateCheck.js
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "flagged_duplicate", "rejected"],
      default: "pending",
    },

    // --- Buyer-interest tracking -> demand score -> auction eligibility ---
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
    followThroughCount: { type: Number, default: 0 }, // buyer followed the artist after viewing
    demandScore: { type: Number, default: 0 }, // see services/reputationEngine.js
    auctionEligible: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["listed", "in_auction", "sold"],
      default: "listed",
    },
  },
  { timestamps: true }
);

ArtworkSchema.statics.CATEGORIES = CATEGORIES;
ArtworkSchema.statics.MEDIUMS = MEDIUMS;

module.exports = mongoose.model("Artwork", ArtworkSchema);

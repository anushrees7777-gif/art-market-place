const mongoose = require("mongoose");

// The buyer "taste vector" is the running average of the feature vectors
// (see Artwork.featureVector) of every artwork the buyer has interacted with,
// weighted by interaction type. It is what the recommendation engine compares
// artworks against with cosine similarity (see services/recommendationEngine.js).
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["artist", "buyer", "admin"], default: "buyer" },

    // Artist-only fields
    bio: { type: String, default: "" },
    reputationScore: { type: Number, default: 0 }, // see services/reputationEngine.js
    salesCount: { type: Number, default: 0 },
    verifiedReviewsCount: { type: Number, default: 0 },

    // Buyer-only fields
    tasteVector: { type: [Number], default: [] },
    tasteVectorInteractionCount: { type: Number, default: 0 },
    preferredCategories: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);

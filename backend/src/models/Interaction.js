const mongoose = require("mongoose");

// Every view/like/save/follow is logged here. This is the raw signal that
// both the recommendation engine (buyer taste vector) and the reputation
// engine (artwork demand score / artist reputation) are built from.
const InteractionSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    artwork: { type: mongoose.Schema.Types.ObjectId, ref: "Artwork", required: true },
    type: {
      type: String,
      enum: ["view", "like", "save", "follow_artist"],
      required: true,
    },
  },
  { timestamps: true }
);

InteractionSchema.index({ buyer: 1, artwork: 1, type: 1 });

module.exports = mongoose.model("Interaction", InteractionSchema);

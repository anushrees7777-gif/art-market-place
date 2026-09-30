const mongoose = require("mongoose");

const BidSchema = new mongoose.Schema(
  {
    artwork: { type: mongoose.Schema.Types.ObjectId, ref: "Artwork", required: true },
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

BidSchema.index({ artwork: 1, amount: -1 });

module.exports = mongoose.model("Bid", BidSchema);

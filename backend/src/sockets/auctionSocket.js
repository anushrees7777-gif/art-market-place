const jwt = require("jsonwebtoken");
const Artwork = require("../models/Artwork");
const Bid = require("../models/Bid");

// Auction Integrity (pitch deck, "Trust & Verification" slide): every bid is
// validated server-side against the current highest bid before it is
// accepted or broadcast. A client can *propose* a bid; only the server's
// broadcast is authoritative, so a malicious client spoofing a higher number
// client-side can't actually win anything.
const MIN_INCREMENT_PCT = 0.05; // each new bid must beat the current one by >= 5%

function registerAuctionSocket(io) {
  const auctionNsp = io.of("/auctions");

  auctionNsp.use((socket, next) => {
    // Optional auth: viewers can watch without a token, only bidding requires one
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        // invalid token -> treat as anonymous viewer, bidding attempts will be rejected below
      }
    }
    next();
  });

  auctionNsp.on("connection", (socket) => {
    socket.on("join_auction", async ({ artworkId }) => {
      socket.join(roomFor(artworkId));
      const [artwork, highestBid] = await Promise.all([
        Artwork.findById(artworkId).lean(),
        Bid.findOne({ artwork: artworkId }).sort({ amount: -1 }).populate("bidder", "name").lean(),
      ]);
      socket.emit("auction_state", {
        artworkId,
        status: artwork?.status,
        startPrice: artwork?.price,
        currentPrice: highestBid?.amount || artwork?.price,
        highestBidder: highestBid?.bidder?.name || null,
      });
    });

    socket.on("place_bid", async ({ artworkId, amount }) => {
      if (!socket.user) {
        return socket.emit("bid_rejected", { reason: "Login required to bid" });
      }
      try {
        const artwork = await Artwork.findById(artworkId);
        if (!artwork || artwork.status !== "in_auction") {
          return socket.emit("bid_rejected", { reason: "This artwork is not in a live auction" });
        }

        const currentHighest = await Bid.findOne({ artwork: artworkId }).sort({ amount: -1 });
        const floor = currentHighest
          ? currentHighest.amount * (1 + MIN_INCREMENT_PCT)
          : artwork.price;

        if (!(Number(amount) >= floor)) {
          return socket.emit("bid_rejected", {
            reason: `Bid must be at least ${floor.toFixed(2)} (5% above current)`,
            currentPrice: currentHighest?.amount || artwork.price,
          });
        }
        if (currentHighest && String(currentHighest.bidder) === socket.user.id) {
          return socket.emit("bid_rejected", { reason: "You already hold the highest bid" });
        }

        const bid = await Bid.create({ artwork: artworkId, bidder: socket.user.id, amount });

        auctionNsp.to(roomFor(artworkId)).emit("new_highest_bid", {
          artworkId,
          amount: bid.amount,
          bidderId: socket.user.id,
          at: bid.createdAt,
        });
      } catch (err) {
        socket.emit("bid_rejected", { reason: "Server error placing bid" });
      }
    });

    socket.on("leave_auction", ({ artworkId }) => socket.leave(roomFor(artworkId)));
  });

  return auctionNsp;
}

function roomFor(artworkId) {
  return `auction:${artworkId}`;
}

module.exports = registerAuctionSocket;

require("dotenv").config();
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const artworkRoutes = require("./routes/artwork.routes");
const interactionRoutes = require("./routes/interaction.routes");
const recommendationRoutes = require("./routes/recommendation.routes");
const auctionRoutes = require("./routes/auction.routes");
const priceEstimateRoutes = require("./routes/priceEstimate.routes");
const registerAuctionSocket = require("./sockets/auctionSocket");

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

async function main() {
  await connectDB();

  const app = express();
  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(morgan("dev"));
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "canvas-and-bid-api" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/artworks", artworkRoutes);
  app.use("/api/interactions", interactionRoutes);
  app.use("/api/recommendations", recommendationRoutes);
  app.use("/api/auctions", auctionRoutes);
  app.use("/api/price-estimate", priceEstimateRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: CLIENT_ORIGIN } });
  registerAuctionSocket(io);
  app.set("io", io); // so REST routes can emit if ever needed

  server.listen(PORT, () => {
    console.log(`[server] Canvas & Bid API + sockets listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error("[server] fatal startup error", err);
  process.exit(1);
});

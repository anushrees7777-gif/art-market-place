# Canvas & Bid — AI-Powered Art Marketplace

A working MVP of the "Canvas & Bid" capstone idea: artist galleries, buyer-interest
tracking, content-based recommendations, demand-driven reputation scoring,
duplicate-image detection, a transparent price estimator, and real-time
Socket.IO auctions.

## How this improves on a typical reference project (e.g. AuctiArts-style reports)

| Feature | Typical report-only version | This build |
|---|---|---|
| Recommendations | Not implemented | Real cosine-similarity engine over artwork feature vectors |
| Reputation | Not implemented | Demand score (views/likes/saves/follows) rolled up per artist |
| Auctions | "Automated bidding system" described, not built | Real Socket.IO bidding with server-side validation (min increment, no self-outbid, no bidding on non-live items) |
| Trust | FAQ chatbot only | Perceptual-hash duplicate-image detection + admin verification workflow |
| Pricing | Not addressed | Explainable price estimator (see "Price estimator" below) |
| Database | Single loosely-typed document blob | Proper relational schema: User / Artwork / Interaction / Bid |

## Architecture

```
frontend (React + Vite, port 5173)
   |  REST (axios)              |  WebSocket (socket.io-client)
   v                            v
backend (Express, port 5000) --- Socket.IO /auctions namespace
   |
   v
MongoDB (in-memory by default for local dev; swap in a real MONGO_URI later)
```

- **Recommendation engine** (`backend/src/services/recommendationEngine.js`): each
  artwork gets a numeric feature vector (category, medium, price band, dominant
  colors) at upload time. Each buyer has a running "taste vector" built from a
  weighted average of everything they've viewed/liked/saved/followed. Cosine
  similarity ranks the gallery for each buyer.
- **Reputation engine** (`backend/src/services/reputationEngine.js`): every
  interaction recomputes a per-artwork demand score, which rolls up into an
  artist-level reputation score. Cross a demand threshold and the artwork
  becomes auction-eligible.
- **Price estimator** (`backend/src/services/priceEstimator.js`): a transparent,
  explainable heuristic over category/medium/size/artist-reputation — directly
  inspired by the CS230 paper "The Art of Predicting Art Auction Price" (Nho &
  Park), whose numeric-feature branch alone beat a linear baseline. A full
  trained CNN+MLP fusion needs thousands of historical sales; this heuristic is
  the practical starting point, isolated behind one function so you can swap
  in a trained regression model later without touching any caller.
- **Trust**: `services/duplicateCheck.js` computes a perceptual hash (aHash) of
  every uploaded image and flags close matches (Hamming distance ≤ 6) for
  admin review instead of blindly rejecting or blindly accepting.
- **Live auctions**: `sockets/auctionSocket.js` — bids are validated server-side
  (≥5% above the current highest, no bidding on your own leading bid, artwork
  must actually be `in_auction`). The client can't spoof a win.

## Step-by-step setup

### 1. Prerequisites
- Node.js 18+ and npm
- No database install needed to start — see note below.

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env        # defaults are fine to start
npm run seed                # creates 2 demo artists, 2 demo buyers, 4 artworks, and interactions
npm run dev                 # starts API + Socket.IO on http://localhost:5000
```
> **Zero-config database:** if `MONGO_URI` is unset (the default in `.env.example`),
> the backend automatically starts an in-memory MongoDB persisted to
> `backend/.mongo-data/`, so `npm run seed` and `npm run dev` share the same data
> with no MongoDB Atlas account or local `mongod` install needed. **Run `seed`
> and `dev` one at a time, not simultaneously** — they share one on-disk data
> directory. When you're ready for a real deployment, put a real connection
> string (local `mongod`, or a free MongoDB Atlas cluster) in `MONGO_URI` in
> `.env` and everything else is unchanged.

### 3. Frontend
In a second terminal:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

### 4. Try it out
1. Open `http://localhost:5173`. You should see 4 seeded artworks.
2. Log in as a buyer: `buyer1@example.com` / `password123`.
3. Like/save a couple of paintings, then check **"For You"** — recommendations
   adapt immediately.
4. Log in as the artist `meera@example.com` / `password123`, open "Evening
   Ochre" — it should already be **auction-eligible** from the seed data.
   Start the auction.
5. Open the auction link in a second browser tab (or log in as `buyer2`) and
   place bids — you'll see them sync in real time over the socket.
6. Log in as an artist and go to **Upload Artwork** — watch the suggested
   price update live as you change category/medium/size.

### 5. Suggested next steps (Phase 3 from your pitch deck)
- Swap the price estimator for a trained regression model once you've
  collected enough real completed sales (the function signature is already
  isolated for this).
- Add Razorpay test-mode checkout on top of a completed auction/direct sale.
- Add an admin UI for the `verificationStatus: "flagged_duplicate"` review
  queue (the API endpoint `PATCH /api/artworks/:id/verify` already exists).
- Deploy: frontend to Vercel/Netlify, backend to Render/Railway, and switch
  `MONGO_URI` to a MongoDB Atlas free-tier cluster.

## API reference (quick)

| Method | Route | Notes |
|---|---|---|
| POST | `/api/auth/signup`, `/api/auth/login` | JWT auth |
| GET | `/api/artworks?category=&sort=demand` | browse/search/filter |
| POST | `/api/artworks` | artist upload (multipart, runs AI analysis + dup check) |
| POST | `/api/interactions` | `{ artworkId, type: view|like|save|follow_artist }` |
| GET | `/api/recommendations` | buyer's personalized feed |
| POST | `/api/price-estimate` | `{ category, medium, widthCm, heightCm }` |
| POST | `/api/auctions/:artworkId/start` | artist starts a live auction |
| Socket `/auctions` | `join_auction`, `place_bid`, `leave_auction` | real-time bidding |

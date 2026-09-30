import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api.js";
import { connectAuctionSocket } from "../socket.js";
import { useAuth } from "../AuthContext.jsx";

export default function LiveAuction() {
  const { id } = useParams();
  const { user } = useAuth();
  const [artwork, setArtwork] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [feed, setFeed] = useState([]);
  const [rejection, setRejection] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    api.get(`/artworks/${id}`).then((res) => setArtwork(res.data));

    const socket = connectAuctionSocket();
    socketRef.current = socket;
    socket.emit("join_auction", { artworkId: id });

    socket.on("auction_state", (state) => {
      setCurrentPrice(state.currentPrice);
    });
    socket.on("new_highest_bid", (bid) => {
      setCurrentPrice(bid.amount);
      setRejection("");
      setFeed((f) => [{ amount: bid.amount, at: bid.at }, ...f].slice(0, 15));
    });
    socket.on("bid_rejected", ({ reason }) => setRejection(reason));

    return () => {
      socket.emit("leave_auction", { artworkId: id });
      socket.disconnect();
    };
  }, [id]);

  function placeBid(e) {
    e.preventDefault();
    if (!user) return setRejection("Log in to bid.");
    socketRef.current.emit("place_bid", { artworkId: id, amount: Number(bidAmount) });
  }

  const minNext = currentPrice ? Math.ceil(currentPrice * 1.05) : null;

  return (
    <div className="auction-layout">
      <h1>{artwork?.title || "Live auction"}</h1>
      <p className="muted">Real-time bidding over Socket.IO — every bid is validated server-side (see backend sockets/auctionSocket.js).</p>

      <div className="auction-price-box">
        <span className="muted">Current price</span>
        <p className="estimate-figure">₹{currentPrice?.toLocaleString("en-IN") ?? "—"}</p>
        {minNext && <p className="muted small">Next valid bid: ≥ ₹{minNext.toLocaleString("en-IN")}</p>}
      </div>

      <form className="bid-form" onSubmit={placeBid}>
        <input
          type="number"
          placeholder={minNext ? `${minNext} or more` : "Bid amount"}
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
        />
        <button type="submit">Place bid</button>
      </form>
      {rejection && <p className="error">{rejection}</p>}

      <h3>Recent bids</h3>
      <ul className="bid-feed">
        {feed.map((b, i) => (
          <li key={i}>
            ₹{b.amount.toLocaleString("en-IN")} <span className="muted small">{new Date(b.at).toLocaleTimeString()}</span>
          </li>
        ))}
        {feed.length === 0 && <li className="muted">No bids yet — be the first.</li>}
      </ul>
    </div>
  );
}

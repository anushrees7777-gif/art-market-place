import { Link } from "react-router-dom";
import { ASSET_BASE } from "../api.js";

export default function ArtworkCard({ artwork }) {
  const swatch = artwork.dominantColors?.[0]
    ? `rgb(${artwork.dominantColors[0].join(",")})`
    : "#e8e2d8";

  return (
    <Link to={`/artwork/${artwork._id}`} className="card">
      <div className="card-image" style={{ background: swatch }}>
        <img
          src={`${ASSET_BASE}${artwork.imageUrl}`}
          alt={artwork.title}
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        {artwork.status === "in_auction" && <span className="badge live">LIVE AUCTION</span>}
        {artwork.auctionEligible && artwork.status === "listed" && (
          <span className="badge eligible">Auction-eligible</span>
        )}
      </div>
      <div className="card-body">
        <h3>{artwork.title}</h3>
        <p className="muted">
          {artwork.category} · {artwork.medium}
        </p>
        <div className="card-foot">
          <strong>₹{artwork.price?.toLocaleString("en-IN")}</strong>
          <span className="muted small">by {artwork.artist?.name}</span>
        </div>
        {typeof artwork.similarityScore === "number" && (
          <p className="muted small">match {(artwork.similarityScore * 100).toFixed(0)}%</p>
        )}
      </div>
    </Link>
  );
}

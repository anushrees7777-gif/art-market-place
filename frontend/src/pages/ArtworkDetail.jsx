import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { ASSET_BASE } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function ArtworkDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [artwork, setArtwork] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get(`/artworks/${id}`).then((res) => setArtwork(res.data));
  }, [id]);

  async function interact(type) {
    if (!user || user.role !== "buyer") {
      setMsg("Log in as a buyer to do that.");
      return;
    }
    try {
      const { data } = await api.post("/interactions", { artworkId: id, type });
      setMsg(
        `Recorded. Demand score now ${data.demandScore?.toFixed(1)}${
          data.auctionEligible ? " — auction-eligible!" : ""
        }`
      );
      const res = await api.get(`/artworks/${id}`);
      setArtwork(res.data);
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed");
    }
  }

  async function startAuction() {
    try {
      await api.post(`/auctions/${id}/start`);
      navigate(`/auction/${id}`);
    } catch (err) {
      setMsg(err.response?.data?.error || "Could not start auction");
    }
  }

  if (!artwork) return <p>Loading…</p>;
  const isOwner = user && artwork.artist?._id === user.id;

  return (
    <div className="detail-layout">
      <div className="detail-image">
        <img src={`${ASSET_BASE}${artwork.imageUrl}`} alt={artwork.title} onError={(e) => (e.currentTarget.style.display = "none")} />
      </div>
      <div className="detail-info">
        <h1>{artwork.title}</h1>
        <p className="muted">
          {artwork.category} · {artwork.medium}
          {artwork.dimensions?.widthCm ? ` · ${artwork.dimensions.widthCm}×${artwork.dimensions.heightCm} cm` : ""}
        </p>
        <p>{artwork.story}</p>
        <p className="price">₹{artwork.price?.toLocaleString("en-IN")}</p>

        <div className="artist-chip">
          By <strong>{artwork.artist?.name}</strong> · reputation {artwork.artist?.reputationScore?.toFixed(1) ?? 0}
        </div>

        <div className="stats-row">
          <span>{artwork.viewCount} views</span>
          <span>{artwork.likeCount} likes</span>
          <span>{artwork.saveCount} saves</span>
          <span>demand {artwork.demandScore?.toFixed(1)}</span>
        </div>

        {artwork.status === "in_auction" ? (
          <Link className="btn primary" to={`/auction/${id}`}>
            Join live auction →
          </Link>
        ) : (
          <div className="btn-row">
            <button onClick={() => interact("like")}>♥ Like</button>
            <button onClick={() => interact("save")}>Save</button>
            <button onClick={() => interact("follow_artist")}>Follow artist</button>
          </div>
        )}

        {isOwner && artwork.status === "listed" && (
          <div className="owner-panel">
            {artwork.auctionEligible ? (
              <button className="btn primary" onClick={startAuction}>
                Start live auction (demand threshold reached)
              </button>
            ) : (
              <p className="muted small">Not auction-eligible yet — needs more buyer interest.</p>
            )}
          </div>
        )}

        {msg && <p className="muted small">{msg}</p>}
      </div>
    </div>
  );
}

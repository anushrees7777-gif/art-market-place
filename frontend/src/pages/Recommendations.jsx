import { useEffect, useState } from "react";
import api from "../api.js";
import ArtworkCard from "../components/ArtworkCard.jsx";

export default function Recommendations() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/recommendations")
      .then((res) => setArtworks(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>For you</h1>
      <p className="muted">Ranked by cosine similarity between your taste vector and each artwork's feature vector.</p>
      {loading ? (
        <p>Loading…</p>
      ) : artworks.length === 0 ? (
        <p className="muted">No history yet — like or save a few pieces in the gallery first.</p>
      ) : (
        <div className="grid">
          {artworks.map((a) => (
            <ArtworkCard key={a._id} artwork={a} />
          ))}
        </div>
      )}
    </div>
  );
}

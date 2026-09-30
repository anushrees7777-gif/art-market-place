import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import ArtworkCard from "../components/ArtworkCard.jsx";

const CATEGORIES = ["Painting", "Photography", "Digital Art", "Sculpture"];

export default function Home() {
  const [artworks, setArtworks] = useState([]);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (category) params.category = category;
    if (sort === "demand") params.sort = "demand";
    api
      .get("/artworks", { params })
      .then((res) => setArtworks(res.data))
      .finally(() => setLoading(false));
  }, [category, sort]);

  return (
    <div>
      <section className="hero">
        <h1>Give every canvas a buyer.</h1>
        <p>Discover emerging painters, photographers, digital artists and sculptors — ranked by real buyer demand, not who shouts loudest.</p>
      </section>

      <div className="filters">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Newest</option>
          <option value="demand">Most in-demand</option>
        </select>
      </div>

      {loading ? (
        <p>Loading gallery…</p>
      ) : artworks.length === 0 ? (
        <p>
          No artworks yet — run <code>npm run seed</code> in <code>backend/</code>, or{" "}
          <Link to="/register">sign up as an artist</Link> and upload one.
        </p>
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

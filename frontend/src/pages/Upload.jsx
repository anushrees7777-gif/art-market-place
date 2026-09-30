import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

const CATEGORIES = ["Painting", "Photography", "Digital Art", "Sculpture"];
const MEDIUMS = ["Oil", "Acrylic", "Watercolor", "Charcoal", "Digital", "Mixed Media", "Other"];

export default function Upload() {
  const [form, setForm] = useState({
    title: "",
    story: "",
    category: "Painting",
    medium: "Oil",
    widthCm: "",
    heightCm: "",
    price: "",
  });
  const [file, setFile] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Live "Suggested Starting Price" -- re-fetched from the backend's
  // priceEstimator service whenever the artist changes category/medium/size,
  // closing the "No Price Discovery" gap called out in the pitch deck.
  useEffect(() => {
    const t = setTimeout(() => {
      api
        .post("/price-estimate", {
          category: form.category,
          medium: form.medium,
          widthCm: form.widthCm,
          heightCm: form.heightCm,
        })
        .then((res) => setEstimate(res.data))
        .catch(() => setEstimate(null));
    }, 300);
    return () => clearTimeout(t);
  }, [form.category, form.medium, form.widthCm, form.heightCm]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!file) return setError("Please choose an image file.");

    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    body.append("image", file);

    try {
      const { data } = await api.post("/artworks", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    }
  }

  return (
    <div className="upload-layout">
      <form className="form-card" onSubmit={onSubmit}>
        <h2>Upload artwork</h2>
        {error && <p className="error">{error}</p>}

        <label>Title</label>
        <input value={form.title} onChange={(e) => update("title", e.target.value)} required />

        <label>Story / description</label>
        <textarea value={form.story} onChange={(e) => update("story", e.target.value)} rows={3} />

        <div className="row-2">
          <div>
            <label>Category</label>
            <select value={form.category} onChange={(e) => update("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Medium</label>
            <select value={form.medium} onChange={(e) => update("medium", e.target.value)}>
              {MEDIUMS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="row-2">
          <div>
            <label>Width (cm)</label>
            <input type="number" value={form.widthCm} onChange={(e) => update("widthCm", e.target.value)} />
          </div>
          <div>
            <label>Height (cm)</label>
            <input type="number" value={form.heightCm} onChange={(e) => update("heightCm", e.target.value)} />
          </div>
        </div>

        <label>Listing price (₹)</label>
        <input type="number" value={form.price} onChange={(e) => update("price", e.target.value)} required />

        <label>Image file</label>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required />

        <button type="submit">List artwork</button>
      </form>

      <aside className="estimate-panel">
        <h3>Suggested starting price</h3>
        {estimate ? (
          <>
            <p className="estimate-figure">₹{estimate.suggestedPrice.toLocaleString("en-IN")}</p>
            <p className="muted small">
              Typical range ₹{estimate.range.low.toLocaleString("en-IN")} – ₹{estimate.range.high.toLocaleString("en-IN")}
            </p>
            <p className="muted small">
              Based on category, medium, size and your current reputation score — a transparent heuristic, not a black
              box (see backend <code>services/priceEstimator.js</code>).
            </p>
          </>
        ) : (
          <p className="muted small">Fill in category, medium and size to see an estimate.</p>
        )}

        {result && (
          <div className="result-box">
            <p>
              <strong>Listed!</strong> "{result.artwork.title}" is live.
            </p>
            {result.duplicateWarning && <p className="warning">{result.duplicateWarning}</p>}
            <button onClick={() => navigate(`/artwork/${result.artwork._id}`)}>View listing</button>
          </div>
        )}
      </aside>
    </div>
  );
}

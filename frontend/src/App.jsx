import { Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Upload from "./pages/Upload.jsx";
import ArtworkDetail from "./pages/ArtworkDetail.jsx";
import LiveAuction from "./pages/LiveAuction.jsx";
import Recommendations from "./pages/Recommendations.jsx";

function Nav() {
  const { user, logout } = useAuth();
  return (
    <header className="nav">
      <Link to="/" className="brand">
        Canvas <span>&amp; Bid</span>
      </Link>
      <nav>
        <Link to="/">Gallery</Link>
        {user?.role === "buyer" && <Link to="/for-you">For You</Link>}
        {user?.role === "artist" && <Link to="/upload">Upload Artwork</Link>}
        {user ? (
          <>
            <span className="who">
              {user.name} · {user.role}
            </span>
            <button className="link-btn" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  );
}

function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Nav />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/artwork/:id" element={<ArtworkDetail />} />
          <Route path="/auction/:id" element={<LiveAuction />} />
          <Route
            path="/upload"
            element={
              <RequireRole role="artist">
                <Upload />
              </RequireRole>
            }
          />
          <Route
            path="/for-you"
            element={
              <RequireRole role="buyer">
                <Recommendations />
              </RequireRole>
            }
          />
        </Routes>
      </main>
    </AuthProvider>
  );
}

import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("cb_user");
    return raw ? JSON.parse(raw) : null;
  });

  function login(token, userObj) {
    localStorage.setItem("cb_token", token);
    localStorage.setItem("cb_user", JSON.stringify(userObj));
    setUser(userObj);
  }

  function logout() {
    localStorage.removeItem("cb_token");
    localStorage.removeItem("cb_user");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

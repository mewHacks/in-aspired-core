// Authentication context — manages user session, login, logout, token refresh, and Google OAuth
import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import { httpClient } from "../services/httpClient";
import { UserRole } from "@in-aspired/shared";
import i18n from "../i18n";

// User interface
// Represents authenticated user's profile data
//
// Note:
// - role comes from backend (single source of truth)
// - Frontend MUST NOT guess admin status
interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  phoneCountryCode?: string;
  gender?: string;
  dateOfBirth?: string;
  avatar?: string;
  authProvider?: "local" | "google";
  isTwoFactorEnabled?: boolean;

  // Role-based access control (from backend) 
  role: UserRole;

  preferences?: {
    theme: string;
    language: string;
    notifications: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
}

// Auth context interface
// Defines everything exposed to the app via AuthContext
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean; // derived, not stored
  isAuthReady: boolean;
  isLoading: boolean;

  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  googleLogin: (token: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
}

// Create AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
// Wraps the app and provides authentication state
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived admin state (single source of truth)
  // NEVER stored, NEVER guessed
  const isAdmin = user?.role.toLowerCase() === UserRole.ADMIN;



  // Helper to sync user results from DB to LocalStorage
  const syncResults = async (userId: string) => {
    try {
      const res = await httpClient("/api/latest");
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(
          `resultsPersistence_${userId}`,
          JSON.stringify(data)
        );
      }
    } catch (err) {
      console.warn("Failed to sync user results", err);
    }
  };

  // Restore user session on page refresh
  // Uses backend cookie validation (/api/users/me)
  useEffect(() => {
    const checkSession = async () => {
      // Abort the session check if the backend doesn't respond within 8 seconds.
      // Fly.io free tier cold starts can take 15–30s — without this the app
      // stays stuck at the loading screen until the machine fully wakes up.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        // Optimistic UI: load cached user immediately
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        // Validate session via HttpOnly cookie using robust httpClient
        // This handles auto-refresh if token is expired, preventing race conditions
        const res = await httpClient("/api/users/me", { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const fullUser: User = await res.json();

          // Session valid means sync state
          setUser(fullUser);
          if (fullUser.preferences?.language) {
            i18n.changeLanguage(fullUser.preferences.language);
          }
          setIsAuthenticated(true);
          localStorage.setItem("user", JSON.stringify(fullUser)); // Sync fresh

          // Sync result
          await syncResults(fullUser.id || fullUser._id!);
          // Verify failed (cookies invalid/expired)
        } else {
          localStorage.removeItem("user");
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error?.name === 'AbortError') {
          // Backend timed out (cold start) — unblock the app as unauthenticated.
          // User can log in once the backend finishes waking up.
          console.warn("Session check timed out — backend may be cold starting");
        } else {
          console.error("Session check failed", error);
        }

        // Fail-safe: clear auth so user sees login page, not a broken app
        localStorage.removeItem("user");
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsAuthReady(true);
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  // Silent refresh to keep session alive while tab is open
  // Auto-refreshes access token to ensure user stays logged in
  useEffect(() => {
    // No need to refresh if user is not logged in
    if (!isAuthenticated) return;

    // Runs function every X millieseconds to refresh silently in background
    const interval = setInterval(async () => {
      try {
        // Sends a POST request to the backend to get new access token
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });

        // If refresh fails (e.g., refresh token expired), logout user
        if (!response.ok) {
          console.error("Silent refresh failed - logging out");
          setIsAuthenticated(false);
          setUser(null);
          clearInterval(interval);
        }
      } catch (e) { // Error handling 
        console.error("Silent refresh failed", e);
        // On network error, logout to prevent user being stuck in broken state
        setIsAuthenticated(false);
        setUser(null);
        clearInterval(interval);
      }
    }, 14 * 60 * 1000); // 14 minutes (< 15 minutes to ensure the token is refreshed before it expires)

    // Cleanup interval on unmount or if isAuthenticated changes
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Helper to perform fetch with timeout
  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 30000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (err: any) {
      clearTimeout(id);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. The server might be cold starting. Please try again.');
      }
      throw err;
    }
  };

  // Email & password login
  // Backend validates credentials and sets HttpOnly cookie
  const login = async (email: string, password: string, _rememberMe: boolean) => {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include", // Require cookies
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");

    // Backend returns full user object
    const fullUser: User = data.user;

    // Sync UI state
    localStorage.setItem("user", JSON.stringify(fullUser));
    setUser(fullUser);
    if (fullUser.preferences?.language) {
      i18n.changeLanguage(fullUser.preferences.language);
    }
    setIsAuthenticated(true);

    // // Sync results
    await syncResults(fullUser.id || fullUser._id!);
  };

  // Google login
  // Backend validates token and sets cookie
  const googleLogin = async (token: string) => {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "include", // Set cookies
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Google login failed");

    // Backend returns full user object
    const fullUser: User = data.user;

    localStorage.setItem("user", JSON.stringify(fullUser));
    setUser(fullUser);
    if (fullUser.preferences?.language) {
      i18n.changeLanguage(fullUser.preferences.language);
    }
    setIsAuthenticated(true);

    // Sync Results
    await syncResults(fullUser.id || fullUser._id!);
  };

  // Update user locally (after profile edit)
  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const newUser = { ...prev, ...updatedUser };
      localStorage.setItem("user", JSON.stringify(newUser));
      return newUser;
    });
  };

  // Logout
  // Backend returns full user object
  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout failed on server", err);
    }

    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAuthReady,
        isAdmin,
        isLoading,
        login,
        googleLogin,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for accessing auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

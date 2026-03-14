// Saved careers context — tracks and syncs user's bookmarked careers with the API
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchSavedCareers, saveCareer, unsaveCareer } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface SavedCareersContextType {
  savedIds: Set<string>;
  isSaved: (careerId: string) => boolean;
  toggleSave: (careerId: string) => Promise<boolean>;
  isHydrated: boolean; // indicates if saved careers have been loaded
}

const SavedCareersContext = createContext<SavedCareersContextType | null>(null);

export const SavedCareersProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { isAuthenticated, isAuthReady } = useAuth();

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

  const isSaved = useCallback(
    (careerId: string) => savedIds.has(careerId),
    [savedIds]
  );

  // Hydrate saved careers AFTER auth state is stable
  useEffect(() => {
    if (!isAuthReady) return;

    // Reset hydration state on auth change
    setIsHydrated(false);

    if (!isAuthenticated) {
      setSavedIds(new Set());
      setIsHydrated(true);
      return;
    }

    const loadSavedCareers = async () => {
      const careers = await fetchSavedCareers();
      console.log("Saved careers from backend:", careers);

      try {
        const careers = await fetchSavedCareers();
        setSavedIds(new Set(careers.map((c: any) => c.career_id ?? c.id)));
      } catch (err) {
        console.error("Failed to fetch saved careers", err);
        setSavedIds(new Set());
      } finally {
        setIsHydrated(true);
      }
    };

    loadSavedCareers();
  }, [isAuthReady, isAuthenticated]);

  // Toggle save / unsave
  // BLOCKED until hydration finishes
  const toggleSave = async (careerId: string): Promise<boolean> => {
    if (!isHydrated) {
      throw new Error("Saved careers not hydrated yet");
    }

    const currentlySaved = savedIds.has(careerId);

    if (currentlySaved) {
      await unsaveCareer(careerId);
    } else {
      await saveCareer(careerId);
    }

    setSavedIds(prev => {
      const next = new Set(prev);
      currentlySaved ? next.delete(careerId) : next.add(careerId);
      return next;
    });

    return !currentlySaved;
  };

  return (
    <SavedCareersContext.Provider
      value={{
        savedIds,
        isSaved,
        toggleSave,
        isHydrated,
      }}
    >
      {children}
    </SavedCareersContext.Provider>
  );
};

export const useSavedCareers = () => {
  const ctx = useContext(SavedCareersContext);
  if (!ctx) {
    throw new Error(
      "useSavedCareers must be used within SavedCareersProvider"
    );
  }
  return ctx;
};
// Saved courses context — tracks and syncs user's bookmarked courses with the API
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchSavedCourses, saveCourse, unsaveCourse } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface SavedCoursesContextType {
  savedIds: Set<string>;
  isSaved: (courseId: string) => boolean;
  toggleSave: (courseId: string) => Promise<boolean>;
  isHydrated: boolean; // indicates if saved courses have been loaded
}

const SavedCoursesContext = createContext<SavedCoursesContextType | null>(null);

export const SavedCoursesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAuthReady } = useAuth();

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

  const isSaved = useCallback(
    (courseId: string) => savedIds.has(courseId),
    [savedIds]
  );

  // Hydrate saved courses AFTER auth state is stable
  useEffect(() => {
    if (!isAuthReady) return;

    setIsHydrated(false);

    if (!isAuthenticated) {
      setSavedIds(new Set());
      setIsHydrated(true);
      return;
    }

    const loadSavedCourses = async () => {
      try {
        const courses = await fetchSavedCourses();
        setSavedIds(new Set(courses.map((c: any) => c.course_id ?? c.id)));
      } catch (err) {
        console.error("Failed to fetch saved courses", err);
        setSavedIds(new Set());
      } finally {
        setIsHydrated(true);
      }
    };

    loadSavedCourses();
  }, [isAuthReady, isAuthenticated]);

  // Toggle save / unsave
  // BLOCKED until hydration finishes
  const toggleSave = async (courseId: string): Promise<boolean> => {
    if (!isHydrated) {
      throw new Error("Saved courses not hydrated yet");
    }

    const currentlySaved = savedIds.has(courseId);

    if (currentlySaved) {
      await unsaveCourse(courseId);
    } else {
      await saveCourse(courseId);
    }

    setSavedIds(prev => {
      const next = new Set(prev);
      currentlySaved ? next.delete(courseId) : next.add(courseId);
      return next;
    });

    return !currentlySaved;
  };

  return (
    <SavedCoursesContext.Provider
      value={{
        savedIds,
        isSaved,
        toggleSave,
        isHydrated,
      }}
    >
      {children}
    </SavedCoursesContext.Provider>
  );
};

export const useSavedCourses = () => {
  const ctx = useContext(SavedCoursesContext);
  if (!ctx) {
    throw new Error(
      "useSavedCourses must be used within SavedCoursesProvider"
    );
  }
  return ctx;
};

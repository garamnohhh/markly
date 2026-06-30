import { useEffect } from "react";
import { useStore } from "../store";

// Reflects the persisted theme onto <html class="dark">; CSS vars do the rest.
export function useDarkMode() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
}

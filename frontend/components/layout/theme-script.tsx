"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { applyTheme, getStoredTheme, THEME_STORAGE_KEY } from "@/lib/theme";

// Runs once in the initial HTML before paint (server-inserted, not client-hydrated).
const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var theme=(t==='light'||t==='dark'||t==='system')?t:'system';var d=theme==='dark'||(theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

/**
 * Injects theme class before first paint via SSR stream.
 * React 19 disallows <script> in the client component tree; useServerInsertedHTML
 * inserts it only into the server HTML response.
 */
export function ThemeScript() {
  const inserted = useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return (
      <script
        id="theme-init"
        dangerouslySetInnerHTML={{ __html: themeInitScript }}
      />
    );
  });

  // Client navigations don't re-run the inline script — re-apply synchronously.
  useLayoutEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  return null;
}

"use client";

import * as React from "react";

export type AppTheme = "colorful";

const ThemeContext = React.createContext<{ theme: AppTheme }>({ theme: "colorful" });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: "colorful" }}>
      <div data-theme="colorful" className="theme-wrapper min-h-screen flex flex-col">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

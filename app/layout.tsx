import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pilotage IT",
  description: "Cockpit de pilotage des tickets Jira de l'équipe IT (lecture seule)",
  robots: { index: false, follow: false },
};

// Applique le thème avant le premier rendu pour éviter un flash clair/sombre.
const themeScript = `(function(){try{var t=localStorage.getItem('pilotage-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}

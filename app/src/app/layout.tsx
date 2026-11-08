import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { MotionProvider } from "@/components/layout/MotionProvider";
import { hr } from "@/i18n/hr";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: hr.app.name,
  description: hr.app.description,
};

export const viewport: Viewport = {
  themeColor: "#eef3fc",
  colorScheme: "light",
};

// Applies the saved text size before first paint (no flash).
const textSizeScript = `try{var s=localStorage.getItem("text");if(s)document.documentElement.dataset.text=s}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hr" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: textSizeScript }} />
      </head>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}

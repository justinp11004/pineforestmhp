import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pine Forest Mobile Home Park",
  description: "Brand-new manufactured homes at 7061 W Vienna Rd, Clio, MI 48420.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

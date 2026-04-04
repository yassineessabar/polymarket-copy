import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PolyX — Copy the Sharpest Minds on Polymarket",
  description:
    "Auto-copy Polymarket's top traders in real-time. Smart money, your wallet, autopilot. $39/month. Demo free.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

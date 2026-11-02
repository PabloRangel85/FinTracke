import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/dm-serif-display";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinTrack | Finanças pessoais",
  description: "Uma visão clara do seu dinheiro, mês a mês.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Марианна Антонова — недвижимость Геленджика",
  description:
    "Квартиры, апартаменты и дома в Геленджике и на побережье. Подбор, юридическая проверка и сопровождение сделки.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

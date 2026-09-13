import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

// La URL pública. `metadataBase` es lo que convierte la imagen de opengraph en
// una URL absoluta: WhatsApp, iMessage y LinkedIn descartan las relativas y el
// link llega sin preview.
//
// AUTH_URL es la variable donde ya vive el dominio, pero si falta el preview se
// rompe en silencio — nadie ve un error, simplemente el link llega pelado. Por
// eso hay red debajo: RAILWAY_PUBLIC_DOMAIN la inyecta Railway sola en cualquier
// servicio con dominio, así que la tarjeta sale bien aunque nadie configure nada.
const APP_URL =
  process.env.AUTH_URL?.replace(/\/$/, "") ||
  (process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`) ||
  "http://localhost:3000";

const DESCRIPTION =
  "Tu bloque de 12 semanas armado con IA, el registro de cada serie desde el celular y tu progreso en números reales.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Trainy — dejá de adivinar, entrená como un atleta",
  description: DESCRIPTION,
  appleWebApp: {
    capable: true,
    title: "Trainy",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Trainy",
    locale: "es_CO",
    url: APP_URL,
    title: "Trainy — dejá de adivinar, entrená como un atleta",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Trainy — dejá de adivinar, entrená como un atleta",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0D100E",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="font-sans">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}

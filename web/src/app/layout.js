import { EB_Garamond, Inter, JetBrains_Mono, Literata, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-eb-garamond',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['300', '400', '500'],
});

const literata = Literata({
  subsets: ['latin'],
  variable: '--font-literata',
  display: 'swap',
  weight: ['400', '500', '700'],
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

export const metadata = {
  title: 'RSVP Reader — Focused Speed Reading',
  description: 'A premium speed-reading tool. RSVP, Flow, and Teleprompter modes with adaptive timing, ORP highlighting, and cinematic design.',
  openGraph: {
    title: 'RSVP Reader',
    description: 'Speed reading with a calm, precision-first interface.',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${ebGaramond.variable} ${inter.variable} ${jetbrainsMono.variable} ${literata.variable} ${ibmPlexSans.variable}`}
    >
      <body data-theme="dark" data-orp="red" data-focus="guided">
        {children}
      </body>
    </html>
  );
}

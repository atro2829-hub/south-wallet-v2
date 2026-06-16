import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/fahed/theme-provider";

export const metadata: Metadata = {
  title: "محفظة الجنوب - محفظتك الرقمية",
  description: "محفظة الجنوب - الدفع والتحويل وإدارة الأموال لليمنيين",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "محفظة الجنوب",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDF5F5" },
    { media: "(prefers-color-scheme: dark)", color: "#1A0A0E" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=yes" />
        <meta name="msapplication-tap-highlight" content="no" />
        {/* Inline script to prevent dark mode flash - reads from next-themes storage key */}
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              var theme = localStorage.getItem('south-wallet-theme');
              if (theme !== '"light"' && theme !== 'light') {
                document.documentElement.classList.add('dark');
                document.documentElement.style.backgroundColor = '#1A0A0E';
                document.body && (document.body.style.backgroundColor = '#1A0A0E');
              }
            } catch(e) {}
          `,
        }} />
      </head>
      <body
        className="antialiased font-sans bg-[#FDF5F5] dark:bg-[#1A0A0E] transition-colors duration-200"
        style={{
          fontFamily: "'Segoe UI', Tahoma, 'Noto Sans Arabic', 'Arial', sans-serif",
          overscrollBehavior: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}

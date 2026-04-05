import type { Metadata } from "next";
import { Inter, Crimson_Pro } from "next/font/google";
import "./global.css";
import ReactQueryProvider from "./providers/ReactQueryProvider";
import { SocketProvider } from "./providers/SocketProvider";
import { GlobalIncomingCallBanner } from "./components/videocalls/IncomingCallBanner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Task Manager",
  description: "A collaborative task management application with user authentication and role-based access",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${crimsonPro.variable} font-ui antialiased`}
      >
        <ReactQueryProvider>
          <SocketProvider>
            {children}
            {/* Global incoming call notification — visible on every page */}
            <GlobalIncomingCallBanner />
          </SocketProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}

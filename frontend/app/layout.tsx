import type { Metadata } from "next";
import { Inter, Crimson_Pro, Geist } from "next/font/google";
import "./global.css";
import ReactQueryProvider from "./providers/ReactQueryProvider";
import { SocketProvider } from "./providers/SocketProvider";
import { GlobalIncomingCallBanner } from "./components/videocalls/IncomingCallBanner";
import { NotificationToastContainer } from "./components/NotificationToastContainer";
import { cn } from "@/lib/utils";
import { PrimeReactProvider } from "primereact/api";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("scroll-smooth", "font-sans", geist.variable)} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${crimsonPro.variable} font-ui antialiased`}
      >
        <ReactQueryProvider>
          <SocketProvider>
            <PrimeReactProvider>
              {children}
              {/* Global incoming call notification — visible on every page */}
              <GlobalIncomingCallBanner />
              {/* Global notification toasts — visible on every page */}
              <NotificationToastContainer />
            </PrimeReactProvider>
          </SocketProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}

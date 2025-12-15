import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CarrierAuthProvider } from "@/context/CarrierAuthContext";
import { LocationTrackingProvider } from "@/context/LocationTrackingContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "PharmaDesk Cargo - Taşıyıcı Sistemi",
    description: "İlaç kargo takip ve QR kod okuma sistemi",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="tr" suppressHydrationWarning={true}>
            <body className={inter.className} suppressHydrationWarning={true}>
                <CarrierAuthProvider>
                    <LocationTrackingProvider>
                        <div className="min-h-screen flex justify-center bg-gray-900">
                            {/* Mobile Container Application Wrapper */}
                            <div className="w-full max-w-md min-h-screen bg-gradient-to-br from-cargo-dark via-cargo to-cargo-light shadow-2xl relative overflow-hidden">
                                {children}
                            </div>
                        </div>
                    </LocationTrackingProvider>
                </CarrierAuthProvider>
            </body>
        </html>
    );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CarrierAuthProvider } from "@/context/CarrierAuthContext";

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
        <html lang="tr">
            <body className={inter.className}>
                <CarrierAuthProvider>
                    {children}
                </CarrierAuthProvider>
            </body>
        </html>
    );
}

import type { Metadata, Viewport } from "next";
import { IdleActivity } from "../components/IdleActivity";
import "../index.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "San Roque Supermarket Retail Systems - Staff Portal",
  description:
    "Secure staff login portal for San Roque Supermarket Retail Systems Inc. Point-of-Sale, Inventory, and Branch Management Systems.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <IdleActivity />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "StockAI - AI-Powered Stock Price Prediction",
  description: "Deep learning powered stock price predictions using LSTM neural networks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#12121a", color: "#e4e4e7", border: "1px solid #1e1e2e" },
          }}
        />
        {children}
      </body>
    </html>
  );
}

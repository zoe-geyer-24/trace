import "./globals.css";
 
export const metadata = {
  title: "Trace — Gluten-Free New York",
  description: "NYC restaurants rated by people who can't cheat. Two scores out of ten: how good, and how safe.",
  appleWebApp: {
    capable: true,
    title: "Trace",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#f7f3e9",
};
 
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
 

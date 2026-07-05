import "./globals.css";

export const metadata = {
  title: "Trace — gluten-free NYC, rated by people who can't cheat",
  description: "Restaurants rated for how good they are and how safe they are for celiacs.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

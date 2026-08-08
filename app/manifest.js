export default function manifest() {
  return {
    name: "Trace — Gluten-Free New York",
    short_name: "Trace",
    description:
      "NYC restaurants rated by people who can't cheat. Two scores out of ten: how good, and how safe.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3e9",
    theme_color: "#f7f3e9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

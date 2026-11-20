import { ImageResponse } from "next/og";
export const alt = "Nepal Metals — Gold and silver reference prices";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "90px",
        background: "#203d34",
        color: "#faf9f0",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 30,
          color: "#d8b868",
          letterSpacing: 5,
        }}
      >
        NEPAL METALS
      </div>
      <div style={{ fontSize: 76, marginTop: 30, lineHeight: 1.15 }}>
        A clearer view of gold & silver.
      </div>
      <div style={{ fontSize: 28, marginTop: 35, color: "#c6d4ca" }}>
        Nepal reference rates · Verified history · Global perspective
      </div>
    </div>,
    size,
  );
}

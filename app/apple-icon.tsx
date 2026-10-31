import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #0e6a80, #04141c)",
          color: "#f4fffb",
          fontSize: 112,
          fontStyle: "italic",
        }}
      >
        n
      </div>
    ),
    size,
  );
}

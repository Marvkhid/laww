import { ImageResponse } from "next/og";

export const runtime = "edge";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#fafaf8",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              backgroundColor: "#A51C30",
              padding: "8px 16px",
              fontSize: "32px",
              fontWeight: "bold",
              color: "#fafaf8",
              fontFamily: "Georgia, serif",
            }}
          >
            LAW
          </div>
          <span
            style={{
              fontSize: "48px",
              fontStyle: "italic",
              color: "#17140f",
              fontFamily: "Georgia, serif",
            }}
          >
            Digest
          </span>
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "#6e6a63",
            fontFamily: "Georgia, serif",
            lineHeight: 1.4,
            maxWidth: "800px",
          }}
        >
          Africa&apos;s premier law journal — legal practice, policy, and
          commentary across Nigeria and beyond.
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "80px",
            fontSize: "18px",
            color: "#A51C30",
            fontFamily: "sans-serif",
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          nglawdigest.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

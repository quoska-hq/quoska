import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = "Quoska — Zeiterfassung für deutsche KMU";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const host = site.url.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 76,
          background: "#f5f3ee",
          color: "#17181b",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 26,
            borderBottom: "2px solid rgba(15,23,42,0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#6658d3",
                color: "white",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              Q
            </div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>Quoska</div>
          </div>
          <div
            style={{
              color: "#6658d3",
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Zeiterfassung für deutsche Betriebe
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              maxWidth: 960,
              fontFamily: "serif",
              fontSize: 82,
              lineHeight: 0.98,
              letterSpacing: -3,
            }}
          >
            Arbeitszeit erfassen. Ohne Theater.
          </div>
          <div style={{ maxWidth: 850, color: "#526078", fontSize: 27 }}>
            Stempeluhr, Pausen, Korrekturen und Auswertungen an einem Ort.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 24,
            borderTop: "2px solid rgba(15,23,42,0.15)",
            color: "#526078",
            fontSize: 20,
          }}
        >
          <div>Bis drei Personen kostenlos</div>
          <div>{host}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

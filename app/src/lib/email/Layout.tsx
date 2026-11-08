import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const ink = "#0A1633";
const muted = "#4A5878";

export const styles = {
  h1: {
    color: ink,
    fontSize: "24px",
    fontWeight: 700,
    lineHeight: "1.3",
    margin: "0 0 12px",
  },
  p: { color: ink, fontSize: "17px", lineHeight: "1.55", margin: "0 0 12px" },
  label: {
    color: muted,
    fontSize: "14px",
    margin: "0",
    textTransform: "none" as const,
  },
  value: { color: ink, fontSize: "17px", fontWeight: 600, margin: "0 0 12px" },
  button: {
    backgroundColor: "#0028AB",
    borderRadius: "14px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "18px",
    fontWeight: 700,
    padding: "16px 28px",
    textDecoration: "none",
  },
  badge: (bg: string, fg: string) => ({
    backgroundColor: bg,
    borderRadius: "999px",
    color: fg,
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 700,
    padding: "4px 12px",
  }),
};

/** Plain, readable email shell — large type, one column, no images. */
export function Layout({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html lang="hr">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#EEF3FC",
          fontFamily: "Inter, Arial, sans-serif",
          margin: 0,
          padding: "24px 12px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            maxWidth: "560px",
            padding: "28px",
          }}
        >
          <Text
            style={{
              color: "#0028AB",
              fontSize: "18px",
              fontWeight: 700,
              margin: "0 0 20px",
            }}
          >
            Uputko
          </Text>
          {children}
          <Hr style={{ borderColor: "#d3dcee", margin: "24px 0 16px" }} />
          <Section>
            <Text
              style={{
                color: muted,
                fontSize: "13px",
                lineHeight: "1.5",
                margin: 0,
              }}
            >
              Demo prototip (Datathon 2026). Svi pacijenti su izmišljeni. U
              stvarnom sustavu uputnica se izdaje u CEZIH-u. Uputko ne postavlja
              dijagnoze. U hitnom slučaju nazovite 112.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

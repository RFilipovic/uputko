import { Button, Heading, Section, Text } from "@react-email/components";
import type { CaseSummary } from "@/lib/agent/schemas";
import { Layout, styles } from "./Layout";

const URGENCY = {
  hitno: { label: "Hitno", bg: "#FDE2E2", fg: "#9B1C1C" },
  uskoro: { label: "Uskoro (1–2 dana)", bg: "#FFF1D6", fg: "#7A4A00" },
  rutinski: { label: "Rutinski", bg: "#E6E2EE", fg: "#16132E" },
} as const;

export function DoctorCaseEmail(props: {
  doctorName: string;
  patientName: string;
  patientAge: number;
  summary: CaseSummary;
  /** City only — the exact position stays in the secure portal. */
  currentCity: string;
  caseUrl: string;
}) {
  const s = props.summary;
  const u = URGENCY[s.urgency];
  const rows: Array<[string, string]> = [
    ["Tegoba", s.chief_complaint],
    ["Gdje", s.body_location],
    ["Od kada", `${s.onset}${s.duration ? ` · ${s.duration}` : ""}`],
    [
      "Temperatura",
      s.fever === "da"
        ? s.fever_celsius
          ? `da, ${s.fever_celsius} °C`
          : "da"
        : s.fever,
    ],
    ["Jačina", s.severity ? `${s.severity}/10` : "nije navedeno"],
    ["Prateće tegobe", s.associated_symptoms.join(", ") || "nema"],
    ["Povijest", s.relevant_history || "ništa navedeno"],
  ];
  if (s.for_child) rows.unshift(["Dijete", s.child_age ?? "dob nije navedena"]);

  return (
    <Layout
      preview={`Novi slučaj: ${props.patientName} — ${s.chief_complaint}`}
    >
      <Heading style={styles.h1}>Novi slučaj: {props.patientName}</Heading>
      <Text style={styles.p}>
        Poštovani/a dr. {props.doctorName}, vaš pacijent opisao je tegobu u
        Uputku. Sažetak je pripremio asistent iz razgovora —{" "}
        <strong>nije dijagnoza</strong>.
      </Text>
      <Text style={styles.badge(u.bg, u.fg)}>{u.label}</Text>
      <Section style={{ margin: "16px 0 0" }}>
        <Text style={styles.label}>Pacijent</Text>
        <Text style={styles.value}>
          {props.patientName}, {props.patientAge} g. · trenutno u:{" "}
          {props.currentCity}
        </Text>
        {rows.map(([k, v]) => (
          <div key={k}>
            <Text style={styles.label}>{k}</Text>
            <Text style={styles.value}>{v}</Text>
          </div>
        ))}
        <Text style={styles.label}>
          Prijedlog specijalnosti (prijedlog, ne dijagnoza)
        </Text>
        <Text style={styles.value}>{s.suggested_specialty}</Text>
      </Section>
      <Section style={{ margin: "8px 0 0" }}>
        <Button href={props.caseUrl} style={styles.button}>
          Otvori slučaj
        </Button>
      </Section>
      <Text style={{ ...styles.label, marginTop: "12px" }}>
        Poveznica je osobna i vrijedi 72 sata. U portalu učitajte uputnicu;
        pacijent je dobiva odmah.
      </Text>
    </Layout>
  );
}

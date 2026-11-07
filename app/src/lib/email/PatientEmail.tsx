import { Button, Heading, Section, Text } from "@react-email/components";
import { Layout, styles } from "./Layout";

/** One simple template for every patient notification. */
export function PatientEmail(props: {
  preview: string;
  title: string;
  lines: string[];
  details?: Array<[string, string]>;
  buttonLabel: string;
  buttonUrl: string;
}) {
  return (
    <Layout preview={props.preview}>
      <Heading style={styles.h1}>{props.title}</Heading>
      {props.lines.map((l) => (
        <Text key={l} style={styles.p}>
          {l}
        </Text>
      ))}
      {props.details?.length ? (
        <Section style={{ margin: "8px 0" }}>
          {props.details.map(([k, v]) => (
            <div key={k}>
              <Text style={styles.label}>{k}</Text>
              <Text style={styles.value}>{v}</Text>
            </div>
          ))}
        </Section>
      ) : null}
      <Section style={{ margin: "8px 0 0" }}>
        <Button href={props.buttonUrl} style={styles.button}>
          {props.buttonLabel}
        </Button>
      </Section>
    </Layout>
  );
}

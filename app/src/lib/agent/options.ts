// "OPTIONS:" too: in English chats the model sometimes translates the marker.
const OPTIONS_LINE = /\n?[ \t]*(?:OPCIJE|OPTIONS):[ \t]*([^\n]+)\s*$/;

/** "OPCIJE: Da | Ne" at the end of a reply becomes quick-reply buttons. */
export function splitOptions(text: string): {
  text: string;
  options: string[];
} {
  const m = text.match(OPTIONS_LINE);
  if (!m) return { text, options: [] };
  const options = m[1]
    .split("|")
    .map((o) => o.trim())
    .filter((o) => o.length > 0 && o.length <= 40)
    .slice(0, 4);
  return { text: text.slice(0, m.index).trimEnd(), options };
}

/** While streaming: hide a trailing "OPCIJE:" line (even half-written) from the bubble. */
export function visibleText(text: string): string {
  const cut = text.search(
    /\n?[ \t]*O(?:P(?:C(?:I(?:J(?:E:?)?)?)?|T(?:I(?:O(?:N(?:S:?)?)?)?)?)?)?[^\n]*$/,
  );
  if (cut === -1) return text;
  const tail = text.slice(cut).trim();
  const marker = (m: string) => tail.startsWith(m) || m.startsWith(tail);
  return marker("OPCIJE:") || marker("OPTIONS:")
    ? text.slice(0, cut).trimEnd()
    : text;
}

export function normalizeCorpusText(input: string): string {
  return input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim().normalize("NFC");
}

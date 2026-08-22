// Light, non-cryptographic obfuscation for the sealed truth cards inside a
// .citr file. This is deliberately NOT encryption — it just keeps the
// mystery's answer from being plaintext-visible to someone casually
// browsing the archive. The app itself never renders this data to the UI
// except through the one-shot "reveal" step in the Resolve flow. Anyone who
// wants to defeat this by unzipping and decoding base64 always could, in
// the same way a physical player could always peek under the table.

export function obfuscate(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

export function deobfuscate<T>(encoded: string): T {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as T;
}

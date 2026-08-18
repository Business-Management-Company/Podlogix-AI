/* SRT / WebVTT generation from Whisper segments — the two formats differ only
   in header and the millisecond separator (comma vs dot). */

export interface CaptionSegment {
  start: number;
  end: number;
  text: string;
}

function stamp(seconds: number, msSeparator: "," | "."): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${msSeparator}${pad(ms, 3)}`;
}

export function generateSrt(segments: CaptionSegment[]): string {
  return segments
    .map((seg, i) => `${i + 1}\n${stamp(seg.start, ",")} --> ${stamp(seg.end, ",")}\n${seg.text}`)
    .join("\n\n") + "\n";
}

export function generateVtt(segments: CaptionSegment[]): string {
  return (
    "WEBVTT\n\n" +
    segments
      .map((seg) => `${stamp(seg.start, ".")} --> ${stamp(seg.end, ".")}\n${seg.text}`)
      .join("\n\n") +
    "\n"
  );
}

export function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

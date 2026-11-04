import QRCode from "qrcode";

// Fixed text, not Linking.createURL: a printed label must keep working in every build.
const LOCATION_LINK = /^myapp:\/\/inventory\?location=([0-9a-f-]{36})$/i;

/** The text a box label encodes. The phone's own camera opens the app on it too. */
export function locationLink(locationId: string): string {
  return `myapp://inventory?location=${locationId}`;
}

/** The location id in a scanned label, or null when the code is not a my-app label. */
export function parseLocationLink(text: string): string | null {
  return LOCATION_LINK.exec(text.trim())?.[1]?.toLowerCase() ?? null;
}

/** The QR code's dark (true) and light (false) modules, row by row. */
export function qrMatrix(text: string): boolean[][] {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  return Array.from({ length: modules.size }, (_, row) =>
    Array.from({ length: modules.size }, (_, col) => Boolean(modules.get(row, col))),
  );
}

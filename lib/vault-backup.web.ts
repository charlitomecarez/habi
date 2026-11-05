import * as DocumentPicker from "expo-document-picker";

/** Web: downloads the file. */
export async function saveBackupFile(text: string, name: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** The text of the picked file, or null when nothing was picked. */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/json" });
  const file = result.assets?.[0]?.file;
  if (result.canceled || !file) return null;
  return file.text();
}

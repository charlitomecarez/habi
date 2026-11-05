import * as DocumentPicker from "expo-document-picker";

/** Opens the file picker. Returns the upload body, or null when nothing was picked. */
export async function pickStatement(): Promise<FormData | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
  const file = result.assets?.[0]?.file;
  if (result.canceled || !file) return null;
  const form = new FormData();
  form.append("file", file);
  return form;
}

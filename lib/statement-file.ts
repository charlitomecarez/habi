import * as DocumentPicker from "expo-document-picker";

/** Opens the file picker. Returns the upload body, or null when nothing was picked. */
export async function pickStatement(): Promise<FormData | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;
  const form = new FormData();
  // React Native reads the file from this uri when it sends the form.
  form.append("file", { uri: asset.uri, name: asset.name, type: "application/pdf" } as unknown as Blob);
  return form;
}

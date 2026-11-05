import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/** Android: the share sheet, so you can save the file in Drive. The cache copy goes after. */
export async function saveBackupFile(text: string, name: string): Promise<void> {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  try {
    await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Save vault backup" });
  } finally {
    file.delete();
  }
}

/** The text of the picked file, or null when nothing was picked. */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;
  return new File(asset.uri).text();
}

import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";

/** Opens the file picker. Returns the upload body, or null when nothing was picked. */
export async function pickStatement(): Promise<FormData | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;
  const form = new FormData();
  // Expo's fetch reads a File through bytes(). It throws on the React Native { uri } form before it sends anything.
  form.append("file", new File(asset.uri));
  return form;
}

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

/** Makes the PDF on the phone, then opens the Android share sheet. Nothing goes to a server. */
export async function shareTripPdf(html: string, title: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: title });
}

/** Web: opens the browser print window, where you pick Save as PDF. */
export async function shareTripPdf(html: string, _title: string): Promise<void> {
  const page = window.open("", "_blank");
  if (!page) throw new Error("Allow pop-ups for this site, then try again.");
  page.document.write(html);
  page.document.close();
  page.focus();
  page.print();
}

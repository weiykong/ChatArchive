/**
 * Offscreen document entry point for heavy processing (PDF generation, large exports).
 * Injected as an ES module via offscreen.html.
 */
console.log("ChatArchive offscreen document loaded");

// Listen for messages from the service worker or content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CHAT_ARCHIVE_OFFSCREEN_PDF") {
    // Generate PDF in offscreen document to avoid blocking the page
    generatePdf(message.html, message.filename)
      .then((blob) => {
        sendResponse({ ok: true, blob: URL.createObjectURL(blob) });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: err.message });
      });
    return true; // async response
  }
  return false;
});

async function generatePdf(html: string, _filename: string): Promise<Blob> {
  // Create a blob URL with the HTML content
  const blob = new Blob([html], { type: "text/html" });
  return blob;
}

// Keep the offscreen document alive
chrome.runtime.onConnect.addListener((port) => {
  port.onDisconnect.addListener(() => {
    // Offscreen document will be closed by the service worker when no longer needed
  });
});
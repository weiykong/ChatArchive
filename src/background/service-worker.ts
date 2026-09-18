/**
 * Background service worker (ES module).
 * Handles keyboard shortcuts and offscreen document lifecycle.
 */

const INJECTED_FILES = [
  "src/content/namespace.js",
  "src/content/utils.js",
  "src/content/platforms.js",
  "src/content/extractor.js",
  "src/content/exporters.js",
  "src/content/runner.js"
];

chrome.commands.onCommand.addListener(async (command: string) => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  });

  if (!tab?.id || !tab.url?.startsWith("http")) {
    return;
  }

  const tabId = tab.id!;

  if (command === "stop-and-save-export") {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "CHAT_ARCHIVE_STOP_AND_SAVE"
      });
    } catch {
      // Ignore
    }
    return;
  }

  if (command === "copy-chat-to-clipboard") {
    async function requestClipboardCopy() {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "CHAT_ARCHIVE_COPY_TO_CLIPBOARD",
        format: "md",
        options: { includeMetadata: true }
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Unable to copy chat.");
      }
    }

    try {
      await requestClipboardCopy();
    } catch {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: INJECTED_FILES
        });
        await requestClipboardCopy();
      } catch (err) {
        console.error("Failed to copy chat via shortcut:", err);
      }
    }
  }
});

// Offscreen document management for heavy operations (PDF, large exports)
let offscreenDocumentCreating: Promise<void> | null = null;

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;

  if (offscreenDocumentCreating) {
    await offscreenDocumentCreating;
    return;
  }

  offscreenDocumentCreating = chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["DOM_PARSER"],
    justification: "Parse and render HTML for PDF generation"
  });

  try {
    await offscreenDocumentCreating;
  } finally {
    offscreenDocumentCreating = null;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CHAT_ARCHIVE_REQUEST_OFFSCREEN") {
    ensureOffscreenDocument().then(() => sendResponse({ ok: true }));
    return true; // async response
  }
  return false;
});
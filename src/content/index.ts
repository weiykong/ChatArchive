/**
 * Content script entry point - bundles all content scripts into a single IIFE.
 * The individual scripts are IIFE-style and execute on import.
 */

// Import all content script modules - they self-register on window.ChatArchive
import "./namespace.js";
import "./utils.js";
import "./platforms.js";
import "./extractor.js";
import "./exporters.js";
import "./runner.js";

// Export empty to satisfy ES module requirements
export {};
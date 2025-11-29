import { GoogleGenAI } from "@google/genai";

// Due to Vite's environment handling for extensions, we assume the key is accessible 
// or will be provided by the user via environment variables during build/execution.
// Since the environment details are not available here, we will use process.env as a fallback 
// although for Vite we should typically rely on import.meta.env
const apiKey = 'AIzaSyBQzxYGBKOChLjwAbPAx9Gsqca0J3-3sOE';

if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined. Gemini API calls will fail.");
}

// Use gemini-2.5-flash for the requested 'gemini-flash-latest' model
const MODEL_NAME = 'gemini-2.5-flash';

const genai = new GoogleGenAI({ apiKey });

const REQUEST_PAGE_TEXT = "GET_TEXT"; // Message type used to request text from Content Script
const REQUEST_SUMMARY = "REQUEST_SUMMARY"; // Message type used by Popup to start summarization process
const REQUEST_ESSENCE = "REQUEST_ESSENCE"; // Message type used by Popup to start essence extraction

// Listener for messages from content scripts or popup
chrome.runtime.onMessage.addListener(
  (request, _sender, sendResponse) => {
    // Return true to indicate that sendResponse will be called asynchronously
    if (request.type !== REQUEST_SUMMARY && request.type !== REQUEST_ESSENCE) {
        return false;
    }

    // Handle REQUEST_SUMMARY or REQUEST_ESSENCE from the Popup
    (async () => {
        try {
            // 1. Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || tab.id === undefined) {
                sendResponse({ summary: "Error: Could not find active tab." });
                return;
            }

            // 2. Ensure content script is running and request page text
            // In Manifest V3, we often need to manually inject if the content script hasn't loaded yet.
            try {
                // Try sending a message first, which fails if the content script is not injected.
                await chrome.tabs.sendMessage(tab.id, { type: 'ping' });
            } catch (e) {
                // If ping fails (connection error), inject the script.
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['src/content.js'] // Must point to the built JS file path relative to dist/
                });
            }

            // Now safely send the actual request message
            // The content script is expected to respond with { text: string } or { error: string }
            const contentScriptResponse = await chrome.tabs.sendMessage(tab.id, { type: REQUEST_PAGE_TEXT });
            
            if (contentScriptResponse.error) {
                sendResponse({ summary: `Error: ${contentScriptResponse.error}` });
                return;
            }

            const pageText = contentScriptResponse.text;

            if (!pageText || pageText.trim().length === 0) {
                sendResponse({ summary: "Error: No extractable text found." });
                return;
            }

            // 3. Perform summarization
            let prompt = "";
            if (request.type === REQUEST_SUMMARY) {
                // New summary prompt (Japanese)
                prompt = `以下の文章を要約せよ。1. 内容をわかりやすく整理し、簡潔にまとめる。2. 文体は必ず「だ・である調」で統一する。3. 重要なポイントは漏らさず、読者が理解できる形でまとめる。\n\n${pageText}`;
            } else if (request.type === REQUEST_ESSENCE) {
                // New essence extraction prompt (Japanese)
                prompt = `以下の文章を読み、その**構造的な課題**、**社会的文脈**、または**未来への影響**という観点から分析し、記事の**真の本質**を深く考察した上で、**簡潔な一文**で示せ。文体は「だ・である調」を用いること。\n\n${pageText}`;
            }

            const response = await genai.models.generateContent({
              model: MODEL_NAME,
              contents: prompt,
            });

            const summary = response.text;
            
            // 4. Respond with the summary to the Popup
            sendResponse({ summary: summary });

        } catch (error) {
            console.error("Summary Process Error:", error);
            let errorMessage = "Error processing summary.";
            
            if (error instanceof Error) {
                errorMessage = `Error processing summary: ${error.message}`;
            }

            sendResponse({ summary: errorMessage });
        }
    })();
    
    // Return true to keep the message channel open for asynchronous sendResponse
    return true;
  }
);
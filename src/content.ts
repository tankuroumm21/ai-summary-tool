// Message type constant for requesting page text
const GET_TEXT = "GET_TEXT";

// Function to extract the main text of the document
function extractPageText(): string {
  // document.body.innerText is used as requested.
  return document.body.innerText;
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(
  (request, _sender, sendResponse) => {
    if (request.type === GET_TEXT) {
      const textContent = extractPageText();
      
      if (textContent.trim().length > 0) {
        // Send the extracted text back to the background script
        sendResponse({
          text: textContent
        });
      } else {
        sendResponse({
          error: "No extractable text found."
        });
      }
      return true; // Indicates asynchronous response
    }
  }
);
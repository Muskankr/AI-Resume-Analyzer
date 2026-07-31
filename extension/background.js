// Context menu option
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "analyze-job",
    title: "Analyze Job Posting with AI Resume Analyzer",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "analyze-job" && tab && tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    }, (results) => {
      if (chrome.runtime.lastError || !results || !results[0]) {
        console.error("Scraping failed:", chrome.runtime.lastError);
        return;
      }
      const data = results[0].result;
      openApp(data);
    });
  }
});

// Listener for message from popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyze") {
    openApp(message.data);
    sendResponse({ success: true });
  }
});

function openApp(data) {
  const baseUrl = "http://localhost:5173/";
  const queryParams = new URLSearchParams();
  
  if (data.role) {
    queryParams.append("role", data.role.trim());
  }
  if (data.job_description) {
    queryParams.append("job_description", data.job_description.trim());
  }
  
  const targetUrl = `${baseUrl}?${queryParams.toString()}`;
  chrome.tabs.create({ url: targetUrl });
}

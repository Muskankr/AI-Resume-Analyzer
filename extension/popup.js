document.getElementById("scrape-btn").addEventListener("click", async () => {
  const statusDiv = document.getElementById("status");
  statusDiv.style.display = "block";
  statusDiv.innerText = "Scraping page details...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      statusDiv.innerText = "Error: Active tab not found.";
      statusDiv.style.color = "#ef4444";
      return;
    }

    // Execute the scraper content script
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    }, (results) => {
      if (chrome.runtime.lastError || !results || !results[0]) {
        console.error("Scrape failed:", chrome.runtime.lastError);
        statusDiv.innerText = "Could not scrape. Opening default app...";
        statusDiv.style.color = "#fbbf24";
        
        // Open app anyway with empty data
        chrome.runtime.sendMessage({
          action: "analyze",
          data: { role: "", job_description: "" }
        }, () => {
          setTimeout(() => window.close(), 1500);
        });
        return;
      }

      const data = results[0].result;
      statusDiv.innerText = "Launching Analyzer App...";
      statusDiv.style.color = "#22c55e";

      chrome.runtime.sendMessage({
        action: "analyze",
        data: data
      }, () => {
        setTimeout(() => window.close(), 1000);
      });
    });
  } catch (err) {
    console.error("Popup handler error:", err);
    statusDiv.innerText = "Error launching app.";
    statusDiv.style.color = "#ef4444";
  }
});

// Opens the settings page when the preview's gear button asks (a page script can't do it itself).
chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'open-options') chrome.runtime.openOptionsPage();
});

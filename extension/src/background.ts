chrome.runtime.onInstalled.addListener(() => {
  if (!chrome.sidePanel) {
    console.error('Side Panel API unavailable. Check browser version.');
    return;
  }

  chrome.sidePanel
    .setPanelBehavior({
      openPanelOnActionClick: true,
    })
    .catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  if (!chrome.sidePanel) return;

  chrome.sidePanel
    .setPanelBehavior({
      openPanelOnActionClick: true,
    })
    .catch(console.error);
});

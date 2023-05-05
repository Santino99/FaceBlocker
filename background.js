chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    //if (request.message === "Hello from content.js!") {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {images: request.images});
      });
    //}
});
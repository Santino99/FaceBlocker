chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(message === 'getSavedImages'){
    chrome.storage.local.get().then(sendResponse);
    return true;
  }
  else if(message === 'getSavedModels'){
    sendResponse(faceapiCache.models);
    return true;
    //console.log(message.img1);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'Take image',
    title: "Import image",
    contexts: ['image'],
  });
});

let countSavedImages = 0;

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if(info.menuItemId === 'Take image'){
    chrome.storage.local.set({['savedImage'+countSavedImages]: info.srcUrl});
    countSavedImages++;
  }
})

/*
chrome.contextMenus.onClicked.addListener((info) => {
  console.log("Example action")
});*/
//if (request.message === "Hello from content.js!") {
    // chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      // chrome.tabs.sendMessage(tabs[0].id, {images: request.images});
    // });
  //}



/*DistanceLayer.className = 'Lambda';
    await faceapi.tf.serialization.registerClass(DistanceLayer);*/

    /*class DistanceLayer extends faceapi.tf.layers.Layer {
      constructor() {
        super({});
      }
    
      call(inputs) {
        const [x1, x2] = inputs;
        return faceapi.tf.abs(faceapi.tf.sub(x1, x2));
      }
  }*/
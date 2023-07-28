// VEDERE PER IL FATTO DEL ICON BACKWARDS
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(message.type === 'getSavedImagesAndModel'){
    let divs = [];
    let images = [];
    let model;
    chrome.storage.local.get().then((all) => {
      for (const [key, val] of Object.entries(all)){
        if(key.startsWith('activeModel')){
          model = val;
        }
        if(key.startsWith('folder')){
          if(val[2] === "On"){
            divs.push(key);
          }
        }
      }
      for (const [key, val] of Object.entries(all)){
        for (const div of divs){
          if(key.startsWith('imageOfFolder'+div)){
            images.push(val[1]);
          }
        }
      }
      return [images, model];
    }).then(sendResponse);

    return true;
  }
  else if(message.type === 'existingImage'){
    chrome.notifications.create({
      type: "basic",
      title: "Notification",
      message: "Image " + message.content + " already present",
      iconUrl: chrome.runtime.getURL('icon.png'),
    });
    sendResponse(true);
    
  }
  else if(message.type === 'addedImage'){
    chrome.notifications.create({
      type: "basic",
      title: "Notification",
      message: "Image " + message.content + " added successfully",
      iconUrl: chrome.runtime.getURL('icon.png'),
    })
    sendResponse(true);
  }
  else if(message.type === 'noDetection'){
    chrome.notifications.create({
      type: "basic",
      title: "Notification",
      message: "No face existing in image " + message.content,
      iconUrl: chrome.runtime.getURL('icon.png'),
    })
    sendResponse(true);
  }
  else if(message.type === 'moreDetections'){
    chrome.notifications.create({
      type: "basic",
      title: "Notification",
      message: "Image " + message.content + " contains more than one face",
      iconUrl: chrome.runtime.getURL('icon.png'),
    })
    sendResponse(true);
  }
  else if(message.type === 'addedFolderFromContext'){
    chrome.notifications.create({
      type: "basic",
      title: "Notification",
      message: "Folder added successfully",
      iconUrl: chrome.runtime.getURL('icon.png'),
    })
    sendResponse(true);
  }
  else if(message.type === 'addedFolderForContext'){
    chrome.storage.local.get().then((all) => {
      for(const [key,val] of Object.entries(all)){
        if(key === message.content){
          chrome.contextMenus.create({
            id: key,
            title: val[1],
            parentId: 'Take image',
            contexts: ['image'],
          });
        }
      }
    }).then(sendResponse(true));
  }
  else if(message.type === 'updateFolderForContext'){
    chrome.storage.local.get().then((all) => {
      for(const [key,val] of Object.entries(all)){
        if(key === message.content){
          if(val[1] === ""){
            chrome.contextMenus.update(
              key, {title: "Untitled Folder"},
            );
          }
          else{
            chrome.contextMenus.update(
              key, {title: val[1]},
            );
          }
        }
      }
    }).then(sendResponse(true));
  }
  else if(message.type === 'removedFolderForContext'){
    chrome.storage.local.get().then((all) => {
      for(const [key,val] of Object.entries(all)){
        if(key === message.content){
          chrome.contextMenus.remove(key);
        }
      }
    }).then(sendResponse(true));
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if(info.srcUrl !== "chrome-extension://agcajemoakhfgjfjbcbfbdlmjpemdpjb/icon.png" && tab.id !== -1){
    if(info.menuItemId.startsWith('folder')){
      chrome.tabs.sendMessage(tab.id, {type: 'saveImageFromContext', content: [info.menuItemId, info.srcUrl]});
      /*chrome.notifications.create({
        type: "basic",
        title: "Notification",
        message: "Saving current image...",
        iconUrl: chrome.runtime.getURL('icon.png'),
      })*/
    }
    else if(info.menuItemId === "Create folder"){
      chrome.tabs.sendMessage(tab.id, {type: 'createFolderFromContext', content: [info.srcUrl]});
    /* chrome.notifications.create({
        type: "basic",
        title: "Notification",
        message: "Creating folder...",
        iconUrl: chrome.runtime.getURL('icon.png'),
      })*/
    }
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            {
              header: 'Access-Control-Allow-Origin',
              operation: 'set',
              value: '*'
            }
          ]
        },
        condition: {
          urlFilter: "https://*/*",
          resourceTypes: ['image']
        }
      },
      {
        id: 2,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            {
              header: 'Access-Control-Allow-Origin',
              operation: 'set',
              value: '*'
            }
          ]
        },
        condition: {
          urlFilter: "http://*/*",
          resourceTypes: ['image']
        }
      },
    ],
    removeRuleIds: [1,2]
  });

  chrome.contextMenus.create({
    id: 'Create folder',
    title: "Create folder with this image",
    contexts: ['image'],
  });

  chrome.contextMenus.create({
    id: 'Take image',
    title: "Import image in",
    contexts: ['image'],
  });

  chrome.storage.local.get().then((all) => {
    for(const [key,val] of Object.entries(all)){
      if(key.startsWith('folder')){
        chrome.contextMenus.create({
          id: key,
          title: val[1],
          parentId: 'Take image',
          contexts: ['image'],
        });
      }
    }
  }).then(() => {return true;})   
});



 /*chrome.storage.local.clear(function() {
          console.log('Tutti i dati sono stati eliminati correttamente.');
        });*/

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
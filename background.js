let counterFolder = 0;

//RIPARTIRE CON IL METTERE LE FOTO PRESE DAL CONTEXT NELLE APPOSITE CARTELLE, CONTROLLANDO CHE NON CI SIA LA STESSA FOTO
// VEDERE PER IL FATTO DEL ICON BACKWARDS
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(message.type === 'getSavedImages'){
    divs = [];
    images = [];
    chrome.storage.local.get().then((all) => {
      for (const [key, val] of Object.entries(all)){
        if(key.startsWith('div')){
          if(val[2] === "On"){
            divs.push(key);
          }
        }
      }
      for (const [key, val] of Object.entries(all)){
        for (const div of divs){
          if(key.startsWith('imageOfDiv'+div)){
            images.push(val[1]);
          }
        }
      }
      return images;
    }).then(sendResponse)

    return true;
  }
  else if(message.type === 'existingImage'){
    chrome.notifications.create({
      type: "basic",
      title: "Avviso",
      message: "L'immagine " + message.content + " è già stata aggiunta",
      iconUrl: chrome.runtime.getURL('icon.png'),
    });
    sendResponse(true);
    
  }
  else if(message.type === 'addedImage'){
    chrome.notifications.create({
      type: "basic",
      title: "Avviso",
      message: "Immagine " + message.content + " aggiunta correttamente",
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
          chrome.contextMenus.update(
            key, {title: val[1]},
          );
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
  else if(message.type === 'getCounter'){
    counterFolder++;
    sendResponse(counterFolder);
    return true;
  }
});

let countSavedImages = 0;

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if(info.menuItemId === 'Take image'){
    //await chrome.storage.local.set({['savedImage'+countSavedImages]: info.srcUrl});
    chrome.runtime.sendMessage('savedImage'+countSavedImages)
    countSavedImages++;
    /*chrome.notifications.create({
      type: "basic",
      title: "Avviso",
      message: "Immagine aggiunta correttamente",
      iconUrl: chrome.runtime.getURL('icon.png'),
    });*/
    return true;
  }
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'Take image',
    title: "Import image in",
    contexts: ['image'],
  });
  chrome.storage.local.get().then((all) => {
    for(const [key,val] of Object.entries(all)){
      if(key.startsWith('div')){
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
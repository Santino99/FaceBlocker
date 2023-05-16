chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(message === 'getSavedImages'){
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
  else if(message === 'existingImage'){
    chrome.notifications.create({
      type: "basic",
      title: "Avviso",
      message: "Quest'immagine è già stata aggiunta",
      iconUrl: chrome.runtime.getURL('icon.png'),
    });
    return true;
  }
  else if(message === 'addedImage'){
    chrome.notifications.create({
      type: "basic",
      title: "Avviso",
      message: "Immagine aggiunta correttamente",
      iconUrl: chrome.runtime.getURL('icon.png'),
    });
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
  //RIPARTIRE DA QUI
  chrome.contextMenus.create({
    id: 'Take image',
    title: "Import image in",
    contexts: ['image'],
  });

  chrome.contextMenus.create({
    id: "Matteo",
    title: "Matteo Salvini",
    parentId: "Take image",
    contexts: ['image'],
  });
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
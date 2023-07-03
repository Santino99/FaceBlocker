// VEDERE PER IL FATTO DEL ICON BACKWARDS
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(message.type === 'getSavedImages'){
        let divs = [];
        let images = [];
        chrome.storage.local.get().then((all) => {
            for (const [key, val] of Object.entries(all)){
                if(key.startsWith('folder')){
                    if(val[2] === "On"){
                        divs.push(key);
                    }
                }
            }
            for (const [key, val] of Object.entries(all)){
                for (const div of divs){
                    if(key.startsWith('imageOfFolder'+div)){
                        images.push(val);
                    }
                }
            }
            console.log(images)
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
            message: "L'immagine " + message.content + " aggiunta correttamente",
            iconUrl: chrome.runtime.getURL('icon.png'),
        })
        sendResponse(true);
    }
    else if(message.type === 'noDetection'){
        chrome.notifications.create({
            type: "basic",
            title: "Avviso",
            message: "Nell'immagine " + message.content + " non è presente alcuna faccia",
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
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if(info.menuItemId.startsWith('folder')){
        chrome.tabs.sendMessage(tab.id, {type: 'saveImageForContext', content: [info.menuItemId, info.srcUrl]});
    }
    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({['counterSavedImages']: 1});

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
let model;

async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  await faceapi.nets.tinyFaceDetector.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  await faceapi.nets.faceLandmark68Net.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  await faceapi.nets.faceRecognitionNet.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));

  console.log("Modelli caricati con successo 2");
}

function areTheSameDescriptorsForContext(descriptors1, descriptors2){
  for(let i=0; i<descriptors1.length; i++){
    if(descriptors1[i] !== descriptors2[i]){
      return false;
    }
  }
  return true;
}

async function isInStorageForContext(valToAdd){
  const all = await chrome.storage.local.get();
  for (const [key, val] of Object.entries(all)){
    if(key.startsWith('imageOfFolder')){
      if(areTheSameDescriptorsForContext(valToAdd, new Float32Array(Object.values(JSON.parse(val[1]))))){
        return true;
      }
    }
  }
  return false;
}

function startOverlay(src){
  if(src !== "chrome-extension://agcajemoakhfgjfjbcbfbdlmjpemdpjb/icon.png"){
    const imgElement = document.querySelector(`img[src="${src}"]`)
    
    const div1 = document.createElement('div');
    div1.className = 'text-center';
    div1.style.width = '100%';
    div1.style.height = '100%';
    div1.style.position = 'absolute';
    div1.style.right = '0px';
    div1.style.bottom = '0px';
    div1.style.display = 'flex';
    div1.style.alignItems = 'center';
    div1.style.justifyContent = 'center';
    div1.style.zIndex = 1;
    div1.style.background = 'rgba(255,255,255,0.8)';

    const div2 = document.createElement('div');
    div2.className = 'spinner-border';
    div2.role = 'status';

    const span = document.createElement('span');
    span.className = 'visually-hidden';

    div2.appendChild(span);
    div1.appendChild(div2);

    imgElement.parentElement.appendChild(div1);
    console.log(imgElement)
  }
}

function stopOverlay(src, mode){
  if(src !== "chrome-extension://agcajemoakhfgjfjbcbfbdlmjpemdpjb/icon.png"){
    const imgElement = document.querySelector(`img[src="${src}"]`)
    const div = imgElement.nextElementSibling;
    div.childNodes[0].remove();
    const checkImage = new Image();
    checkImage.style.width = "60px";
    checkImage.style.height = "60px";
    if(mode === "Ok"){
      checkImage.src = chrome.runtime.getURL('check.png');
    }
    else if(mode === "No"){
      checkImage.src = chrome.runtime.getURL('cross.png');
    }
    div.appendChild(checkImage);
    setTimeout(() => {
      div.remove();
    }, 3000);
  }
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if(message.type === 'saveImageFromContext'){
    startOverlay(message.content[1]);
    divId = message.content[0];
    result = message.content[1];
    filename = "captured";
    let canvases = [];
    let noDetection = false;

    const imageLoadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.crossOrigin = 'anonymous'; 
      img.src = result;
    });
    try {
      await imageLoadPromise.then(async (img) => {
        const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
        if(detections.length > 0){
          for (const detection of detections){
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', {willReadFrequently: true});
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img,
              detection.detection.box.x,
              detection.detection.box.y,
              detection.detection.box.width,
              detection.detection.box.height,
              0, 0, img.width, img.height
            );

            await isInStorageForContext(detection.descriptor).then(async(res) => {
              if(!res){
                canvases.push(canvas.toDataURL('image/jpeg'));
                await chrome.storage.local.set({['imageOfFolder'+divId+canvas.toDataURL('image/jpeg')/*JSON.stringify(detection.descriptor)*/]: [canvas.toDataURL('image/jpeg'), JSON.stringify(detection.descriptor)]});
              }
            });
            canvas.remove();
          }
        }
        else{
          noDetection = true;
        }
      }).then(() => {
        if(canvases.length !== 0 && !noDetection){
          chrome.runtime.sendMessage({type: 'addedImage', content: filename}, (response) => {
            if(response){
              console.log("Ok");
              stopOverlay(message.content[1], "Ok");
            }
          });
        }
        else if(noDetection){
          chrome.runtime.sendMessage({type: 'noDetection', content: filename}, (response) => {
            if(response){
              console.log("Ok");
              stopOverlay(message.content[1], "No");
            }
          });
        }
        else{
          chrome.runtime.sendMessage({type: 'existingImage', content: filename}, (response) => {
            if(response){
              console.log("Ok");
              stopOverlay(message.content[1], "No");
            }
          });
        }
      })
    } catch (error) {
      console.error(error);
    }  

    return canvases;
  }
  else if(message.type === 'createFolderFromContext'){
    startOverlay(message.content[0]);
    let face;
    let divId;
    let noDetection = false;
    let moreDetections = false;

    let filename = "captured";

    const imageLoadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.crossOrigin = 'anonymous';
      img.src = message.content[0];
    });
    try {
      await imageLoadPromise.then(async (img) => {
        const detections = await faceapi.detectAllFaces(img);
        if(detections.length === 1){
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', {willReadFrequently: true});
          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img,
            detections[0].box.x,
            detections[0].box.y,
            detections[0].box.width,
            detections[0].box.height,
            0, 0, img.width, img.height
          );
          face = canvas.toDataURL('image/jpeg');
          divId = new Date().getTime();
          const inputValue = "Empty folder";
          const bTextContent = "On";
          const bClassName = "btn btn-success";
          chrome.storage.local.set({["folder"+divId]: [face, inputValue, bTextContent, bClassName]});
          canvas.remove();
        }
        else if(detections.length === 0){
          noDetection = true;
        }
        else if(detections.length > 1){
          moreDetections = true;
        }
      }).then(() => {
        if(noDetection){
          chrome.runtime.sendMessage({type: 'noDetection', content: filename}, (response) => {
            if(response){
              console.log("No");
              stopOverlay(message.content[0], "No");
            }
          });
        }
        else if(moreDetections){
          chrome.runtime.sendMessage({type: 'moreDetections', content: filename}, (response) => {
            if(response){
              console.log("No");
              stopOverlay(message.content[0], "No");
            }
          });
        }
        else{
          chrome.runtime.sendMessage({type: 'addedFolderForContext', content: 'folder'+divId}, (response) => {
            if(response === true){
              stopOverlay(message.content[0], "Ok");
              console.log("Cartella aggiunta");
              chrome.runtime.sendMessage({type: 'addedFolderFromContext'}, (response) => {
                if(response === true){
                  console.log("Ok");
                }
                else{
                  console.log("No");
                }
              });
            }
            else{
              console.log("Errore nell'aggiunta della cartella");
            }
          });
        }
      })
    } catch (error) {
      console.error(error);
    }  
    return face;
  }
});

async function obscure(image) {
  image.src = chrome.runtime.getURL('icon.png');
  image.srcset = chrome.runtime.getURL('icon.png');
  image.parentNode.insertBefore(image, image.parentNode.firstChild);
  image.removeAttribute('data-original');
}

async function startBlocking(all, image){
  if(image.src !== null){
    const imageLoadPromise = new Promise((resolve, reject) => {
        const img1 = new Image();
        img1.onerror = reject;
        img1.crossOrigin = 'anonymous'; 
        img1.src = image.src;
        if(image.hasAttribute('data-src')){
          img1.src = image.getAttribute('data-src');
        }
        if(image.hasAttribute('data-pagespeed-lazy-src')){
          img1.src = image.getAttribute('data-pagespeed-lazy-src');
        }
        if(image.hasAttribute('data-original')){
          img1.src = image.getAttribute('data-original');
        }
        img1.onload = () => resolve(img1);
    });
    await imageLoadPromise.then(async (img) => {
      let detections;
      if(model === 'tiny'){
        detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
      }
      else if(model === 'bigger'){
        detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
      }
      for(const detection of detections){
        if(detection){
            for (const val of all){ 
              descriptor2 = new Float32Array(Object.values(JSON.parse(val)));
              const distance = await faceapi.euclideanDistance(detection.descriptor, descriptor2);
              if(distance <= 0.6){
                obscure(image)
              }
            }
        }
      }
    });
  }
};

chrome.runtime.sendMessage({type: 'getSavedImagesAndModel'}, (response) => {
  model = response[1];
  loadModels().then(function(){
    var intersectionObserver = new IntersectionObserver(function(entries, observer){
      entries.forEach(entry => {
        if(entry.isIntersecting){
          startBlocking(response[0], entry.target).then(() => observer.unobserve(entry.target));
        }
      });
    });
    
    document.querySelectorAll('img').forEach((image) => {
      intersectionObserver.observe(image);
    });
    
    function handleMutations(mutationsList, observer) {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
          for (let node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              if(node.tagName === 'IMG'){
                intersectionObserver.observe(node)
              }
              else{
                node.querySelectorAll('img').forEach((image) => {
                  image.onload = function(){
                    intersectionObserver.observe(image)
                  }
                });
              }
            }
          }
        }
      }
    }
    const observer = new MutationObserver(handleMutations);

    const targetNode = document.body;
    const config = {childList: true, subtree: true};

    observer.observe(targetNode, config);
  });
});






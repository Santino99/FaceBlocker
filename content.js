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

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if(message.type === 'saveImageForContext'){
    divId = message.content[0];
    result = message.content[1];
    filename = "catturata";
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
        console.log(detections)
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
            }
          });
        }
        else if(noDetection){
          chrome.runtime.sendMessage({type: 'noDetection', content: filename}, (response) => {
            if(response){
              console.log("Ok");
            }
          });
        }
        else{
          chrome.runtime.sendMessage({type: 'existingImage', content: filename}, (response) => {
            if(response){
              console.log("Ok");
            }
          });
        }
      })
    } catch (error) {
      console.error(error);
    }  

    return canvases;
  }
});

async function obscure(img) {
  img.src = chrome.runtime.getURL('icon.png');
  img.srcset = chrome.runtime.getURL('icon.png');
  //img.style.opacity = 0.1
  img.parentNode.insertBefore(img, img.parentNode.firstChild);
}

async function startBlocking(all, image){
  if(image.src !== null){
    const imageLoadPromise = new Promise((resolve, reject) => {
        const img1 = new Image();
        img1.onload = () => resolve(img1);
        img1.onerror = reject;
        img1.crossOrigin = 'anonymous'; 
        img1.src = image.src;
    });
    try {
      await imageLoadPromise.then(async (img) => {
        const model = await chrome.storage.local.get("activeModel");
        if(Object.values(model)[0] === 'tiny'){
          detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        }
        else if(Object.values(model)[0] === 'bigger'){
          detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
        }
        for(const detection of detections){
          if(detection){
              //console.log(detection);
              //console.log(img1);
              for (const val of all){ 
                descriptor2 = new Float32Array(Object.values(JSON.parse(val)));
                const distance = await faceapi.euclideanDistance(detection.descriptor, descriptor2);
                if(distance <= 0.6){
                  await obscure(image)
                  //console.log("Sono la stessa persona");
                }
                else{
                 // console.log("Non sono la stessa persona");
                }
                //console.log(distance);
              }
          }
        }
      });
    } catch (error) {
        //console.error("Immagine con src nullo");
    }
  }
};

chrome.runtime.sendMessage({type: 'getSavedImages'}, (response) => {
  loadModels().then(function(){
    foundedImages = document.querySelectorAll('img');
    const intersectionObserver = new IntersectionObserver(function(entries, observer){
      entries.forEach(entry => {
        if(entry.isIntersecting){
          startBlocking(response, entry.target).then(observer.unobserve(entry.target))
        }
      })
    })
    foundedImages.forEach((image) => {
      intersectionObserver.observe(image);
    })

    const summary = new MutationSummary({
      callback: handleMutations,
      observeOwnChanges: true,
      queries: [{all: true}]
    });
    
    function handleMutations(summaries){
      summaries.forEach(mutation => {
        imagesToAdd = [];
        mutation.added.forEach((node) => {
          if(node.nodeType === Node.ELEMENT_NODE){
            if(node.shadowRoot){
              const shadowRoot = node.shadowRoot;
              shadowRoot.querySelectorAll('img').forEach(image => {
                image.onload = function(){
                  intersectionObserver.observe(image)
                }
              })
            }
            else{
              node.querySelectorAll('img').forEach(image => {
                image.onload = function(){
                  intersectionObserver.observe(image)
                }
              })
            }
          }
        });
      });
    }
  })
});






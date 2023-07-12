let model;

async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  await faceapi.nets.tinyFaceDetector.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  await faceapi.nets.faceLandmark68Net.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  await faceapi.nets.faceRecognitionNet.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));

  model = await chrome.storage.local.get("activeModel");

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
  if(message.type === 'saveImageFromContext'){
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
  else if(message.type === 'createFolderFromContext'){
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
              console.log("Ok");
            }
          });
        }
        else if(moreDetections){
          chrome.runtime.sendMessage({type: 'moreDetections', content: filename}, (response) => {
            if(response){
              console.log("Ok");
            }
          });
        }
        else{
          chrome.runtime.sendMessage({type: 'addedFolderForContext', content: 'folder'+divId}, (response) => {
            if(response === true){
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

function obscure(image) {
  //image.style.visibility = 'visible';
  image.src = chrome.runtime.getURL('icon.png');
  image.srcset = chrome.runtime.getURL('icon.png');
  image.parentNode.insertBefore(image, image.parentNode.firstChild);
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
        let detections;
        if(Object.values(model)[0] === 'tiny'){
          detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        }
        else if(Object.values(model)[0] === 'bigger'){
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
    } catch (error) {
        //console.error("Immagine con src nullo");
    }
  }
};

chrome.runtime.sendMessage({type: 'getSavedImages'}, (response) => {
  loadModels().then(function(){
    foundedImages = document.querySelectorAll('img');

    var intersectionObserver = new IntersectionObserver(function(entries, observer){
      entries.forEach(entry => {
        if(entry.isIntersecting){
          startBlocking(response, entry.target).then(observer.unobserve(entry.target));
        }
      });
    });
    
    foundedImages.forEach((image) => {
      intersectionObserver.observe(image);
    });

    var summary = new MutationSummary({
      callback: handleMutations,
      queries: [{element: 'img'}]
    });

    function handleMutations(summaries){
      summaries.forEach(mutation => {
        console.log(mutation)
        imagesToAdd = [];
        mutation.added.forEach((node) => {
          node.onload = function(){
            intersectionObserver.observe(node);
          }
        });
      });
    }
  });
});






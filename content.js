let icon;
let loaded = false;

async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  await faceapi.nets.tinyFaceDetector.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  await faceapi.nets.faceLandmark68Net.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  await faceapi.nets.faceRecognitionNet.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  console.log("Modelli caricati con successo 2");
  loaded = true;
}

function startOverlay(){
  const div1 = document.createElement('div');
  div1.id = "divLoadingFaceblocker";
  div1.className = 'text-center';
  div1.style.width = window.innerWidth + "px";
  div1.style.height = window.innerHeight + "px";
  div1.style.position = 'fixed';
  div1.style.right = '0px';
  div1.style.bottom = '0px';
  div1.style.display = 'flex';
  div1.style.alignItems = 'center';
  div1.style.justifyContent = 'center';
  div1.style.zIndex = 9999;
  div1.style.background = 'rgba(255,255,255,0.8)';

  const div2 = document.createElement('div');
  div2.className = 'custom-spinner';
  const customCSS = `
  .custom-spinner {
    position: relative;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    animation: spin 2s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }`;

  const styleElement = document.createElement('style');
  styleElement.innerHTML = customCSS;
  document.head.appendChild(styleElement);

  const span = document.createElement('span');
  span.className = 'visually-hidden';

  div2.appendChild(span);
  div1.appendChild(div2);

  document.body.appendChild(div1);
}

function stopOverlay(mode){
  const div = document.getElementById("divLoadingFaceblocker");
  console.log(div);
  div.childNodes[0].childNodes[0].remove;
  div.childNodes[0].removeAttribute('class')
  div.childNodes[0].removeAttribute('role')
  const checkImage = new Image();
  checkImage.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  })
  checkImage.style.width = "60px";
  checkImage.style.height = "60px";
  checkImage.style.zIndex = 9999;
  if(mode === "Ok"){
    checkImage.src = chrome.runtime.getURL('check.png');
  }
  else if(mode === "No"){
    checkImage.src = chrome.runtime.getURL('cross.png');
  }
  div.childNodes[0].appendChild(checkImage);
  setTimeout(() => {
    div.remove();
  }, 3000);
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if(loaded){
    if(message.type === 'saveImageFromContext'){
      startOverlay();
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

              canvases.push(canvas.toDataURL('image/jpeg'));
              await chrome.storage.local.set({['imageOfFolder'+divId+canvas.toDataURL('image/jpeg')]: [canvas.toDataURL('image/jpeg'), JSON.stringify(detection.descriptor)]});
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
                stopOverlay("Ok");
              }
            });
          }
          else if(noDetection){
            chrome.runtime.sendMessage({type: 'noDetection', content: filename}, (response) => {
              if(response){
                console.log("Ok");
                stopOverlay("No");
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
      startOverlay();
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
          const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
          if(detections.length === 1){
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', {willReadFrequently: true});
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img,
              detections[0].detection.box.x,
              detections[0].detection.box.y,
              detections[0].detection.box.width,
              detections[0].detection.box.height,
              0, 0, img.width, img.height
            );
            face = canvas.toDataURL('image/jpeg');
            divId = new Date().getTime();
            const inputValue = "Empty folder";
            const bTextContent = "On";
            const bClassName = "btn btn-success";
            await chrome.storage.local.set({["folder"+divId]: [face, inputValue, bTextContent, bClassName]})
            await chrome.storage.local.set({['imageOfFolderfolder'+divId+face]: [face, JSON.stringify(detections[0].descriptor)]});
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
                stopOverlay("No");
              }
            });
          }
          else if(moreDetections){
            chrome.runtime.sendMessage({type: 'moreDetections', content: filename}, (response) => {
              if(response){
                console.log("No");
                stopOverlay("No");
              }
            });
          }
          else{
            chrome.runtime.sendMessage({type: 'addedFolderForContext', content: 'folder'+divId}, (response) => {
              if(response === true){
                stopOverlay("Ok");
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
  }
});

async function obscure(image) {
  image.addEventListener('contextmenu', function(event){
    event.preventDefault();
  })
  image.src = icon;
  image.srcset = icon;
  image.parentNode.insertBefore(image, image.parentNode.firstChild);
  image.removeAttribute('data-original');
}

async function startBlocking(all, image, mode){
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
      if(mode === 'tiny' || mode === null){
        detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
      }
      else if(mode === 'bigger'){
        detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
      }
      for(const detection of detections){
        if(detection){
            for (const val of all){ 
              descriptor2 = new Float32Array(Object.values(JSON.parse(val)));
              const distance = await faceapi.euclideanDistance(detection.descriptor, descriptor2);
              if(distance <= 0.6){
                await obscure(image);
              }
            }
        }
      }
    });
  }
};

chrome.storage.local.get().then((all) => {
  let divs = [];
  let model;
  let savedImages = [];

  icon = chrome.runtime.getURL('icon.png');

  let intersections = {}

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
        savedImages.push(val[1]);
      }
    }
  }
  loadModels().then(function(){
    if(savedImages.length > 0){
      const intersectionObserver = new IntersectionObserver(function(entries, observer){
        entries.forEach(entry => {
          if(entry.isIntersecting){
            if(model === 'auto'){
              if(!intersections[entry.time]){
                intersections[entry.time] = {entriesTimed: []};
              }
              intersections[entry.time].entriesTimed.push(entry)
              
              if(intersections[entry.time].timer) {
                clearTimeout(intersections[entry.time].timer);
              }      

              intersections[entry.time].timer = setTimeout(() => {
                if(intersections[entry.time].entriesTimed.length > 2){
                  console.log('tiny')
                  intersections[entry.time].entriesTimed.forEach((entry) => {
                    startBlocking(savedImages, entry.target, 'tiny').then(() => {
                      observer.unobserve(entry.target)
                    });
                  })
                }
                else{
                  console.log('bigger')
                  intersections[entry.time].entriesTimed.forEach((entry) => {
                    startBlocking(savedImages, entry.target, 'bigger').then(() => {
                      observer.unobserve(entry.target)
                    });
                  })
                }
                delete intersections[entry.time];
              }, 100);
            }
            else{
              startBlocking(savedImages, entry.target, model).then(() => {
                observer.unobserve(entry.target)
              });
            }
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
      const mutationObserver = new MutationObserver(handleMutations);

      const targetNode = document.body;
      const config = {childList: true, subtree: true};

      mutationObserver.observe(targetNode, config);
    }
  });
});






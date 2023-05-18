async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  await faceapi.nets.faceLandmark68Net.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  await faceapi.nets.faceRecognitionNet.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));

  console.log("Modelli caricati con successo 2");
}

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
        detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        for(const detection of detections){
          if(detection){
              //console.log(detection);
              //console.log(img1);
              for (const val of all){ 
                descriptor2 = new Float32Array(Object.values(JSON.parse(val)));
                const distance = await faceapi.euclideanDistance(detection.descriptor, descriptor2);
                if(distance <= 0.6){
                    await obscure(image)
                    console.log(distance);
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

let savedImages;

// VEDERE PER IL CONTEXT
chrome.runtime.sendMessage({type: 'getSavedImages'}, (response) => {
  savedImages = response;
  loadModels().then(function(){
    foundedImages = document.querySelectorAll('img');
    const intersectionObserver = new IntersectionObserver(function(entries, observer){
      entries.forEach(entry => {
        if(entry.isIntersecting){
          startBlocking(savedImages, entry.target).then(observer.unobserve(entry.target))
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
          // console.log(node);
          if(node.nodeType === Node.ELEMENT_NODE){
            if(node.shadowRoot){
              const shadowRoot = node.shadowRoot;
              // console.log(shadowRoot.querySelectorAll('img'))
              shadowRoot.querySelectorAll('img').forEach(image => {
                image.onload = function(){
                  intersectionObserver.observe(image)
                }
              })
            }
            else{
              //console.log(node.querySelectorAll('img'))
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






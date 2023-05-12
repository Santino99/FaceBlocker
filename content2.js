(async () => {
  async function loadModels() {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
    await faceapi.nets.faceLandmark68Net.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
    await faceapi.nets.faceRecognitionNet.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
  
    console.log("Modelli caricati con successo 2");
  }
  
  function obscure(img) {
    img.src = chrome.runtime.getURL('icon.png');
    img.srcset = chrome.runtime.getURL('icon.png');
    img.parentNode.insertBefore(img, img.parentNode.firstChild);
  }

  function detectUpdatingImages(){
    const summary = new MutationSummary({
      callback: handleMutations,
      observeOwnChanges: true,
      queries: [{all: true}]
    });
    
    async function handleMutations(summaries){
      summaries.forEach(async mutation => {
        imagesToAdd = [];
        mutation.added.forEach((node) => {
          console.log(node);
          if(node.nodeType === Node.ELEMENT_NODE){
            if(node.shadowRoot){
              const shadowRoot = node.shadowRoot;
             // console.log(shadowRoot.querySelectorAll('img'))
              shadowRoot.querySelectorAll('img').forEach(image => {
                imagesToAdd.push(image);
              })
            }
            else{
              //console.log(node.querySelectorAll('img'))
              node.querySelectorAll('img').forEach(image => {
                imagesToAdd.push(image);
              })
            }
          }
        });
        console.log(imagesToAdd.length)
        await startBlocking(savedImages, imagesToAdd);
      });
    }
  }
  
  async function startBlocking(all, images){
    for (const image of images){
      if(image.src !== null){
        const imageLoadPromise = new Promise((resolve, reject) => {
            const img1 = new Image();
            img1.onload = () => resolve(img1);
            img1.onerror = reject;
            img1.crossOrigin = 'anonymous'; 
            img1.src = image.src;
        });
        try {
          const img1 = await imageLoadPromise;
          const detection1 = await faceapi.detectAllFaces(img1).withFaceLandmarks().withFaceDescriptors();
          for(const detection of detection1){
            if(detection){
                //console.log(detection);
                //console.log(img1);
                for (const [key, val] of Object.entries(all)){ 
                  if(!key.startsWith('savedImage')){
                    descriptor2 = new Float32Array(Object.values(JSON.parse(val).descriptor));
                    const distance = await faceapi.euclideanDistance(detection.descriptor, descriptor2);
                    if(distance < 0.6){
                        obscure(image)
                        //console.log("Sono la stessa persona");
                    }
                    else{
                        // console.log("Non sono la stessa persona");
                    }
                    //console.log(distance);
                  }
                }
            }
          }
        } catch (error) {
            //console.error("Immagine con src nullo");
        }
      }
    };
  };
  
  let savedImages;

  // RIPARTIRE DAL VEDERE SU REPUBBLICA.IT CHE METTE IL BLOCCO A FOTO A CASO
  chrome.runtime.sendMessage('getSavedImages', (response) => {
    savedImages = response;
    foundedImages = document.querySelectorAll('img');
    loadModels().then(async function(){
      await startBlocking(savedImages, foundedImages).then(
        detectUpdatingImages()
      );
    });
  });
})();






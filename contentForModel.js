let model;

async function loadModels() {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
    model = await faceapi.tf.loadGraphModel(chrome.runtime.getURL('model3js/model.json'));
    console.log("Modelli caricati con successo 2");
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
            const detections = await faceapi.detectAllFaces(img);
            console.log(detections)
            if(detections.length > 0){
              for (const detection of detections){
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d', {willReadFrequently: true});
                  canvas.width = 105;
                  canvas.height = 105
                  context.drawImage(img,
                      detection.box.x,
                      detection.box.y,
                      detection.box.width,
                      detection.box.height,
                      0, 0, 105, 105
                  );

                  canvases.push(canvas.toDataURL('image/jpeg'));
                  await chrome.storage.local.set({['imageOfFolder'+divId+canvas.toDataURL('image/jpeg')]: canvas.toDataURL('image/jpeg')});
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
          detections = await faceapi.detectAllFaces(img);
          for(const detection of detections){
            if(detection){
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', {willReadFrequently: true});
                canvas.width = 105;
                canvas.height = 105
                context.drawImage(img,
                    detection.box.x,
                    detection.box.y,
                    detection.box.width,
                    detection.box.height,
                    0, 0, 105, 105
                );

                img.src = canvas.toDataURL('image/jpeg');
                for (const val of all){ 
                    const imageLoadPromise2 = new Promise((resolve, reject) => {
                        const img2 = new Image();
                        img2.onload = () => resolve(img2);
                        img2.onerror = reject;
                        img2.crossOrigin = 'anonymous'; 
                        img2.src = val;
                    });
                    try {
                      await imageLoadPromise2.then(async (img2) => {
                        const imageData1 = img;
                        const tensor1 = faceapi.tf.browser.fromPixels(imageData1);
                        const normalizedTensor1 = tensor1.cast("float32").div(faceapi.tf.scalar(255));
                        const batchedTensor1 = normalizedTensor1.expandDims(0, normalizedTensor1);

                        const imageData2 = img2
                        const tensor2 = faceapi.tf.browser.fromPixels(imageData2);
                        const normalizedTensor2 = tensor2.cast("float32").div(faceapi.tf.scalar(255));
                        const batchedTensor2 = normalizedTensor2.expandDims(0, normalizedTensor2);
                        

                        predictions = await model.execute([batchedTensor1, batchedTensor2]).data().then(results => {
                            console.log(results[0])
                            if(results[0]<=0.5){
                                obscure(image);
                                console.log("Sono la stessa persona")
                            }
                            else{
                                console.log("Non sono la stessa persona")
                            }
                            batchedTensor1.dispose();
                            batchedTensor2.dispose();
                        })
                      });
                    } catch (error) {
                        //console.error("Immagine con src nullo");
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


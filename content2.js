async function loadModels() {
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model')),
    faceapi.nets.faceLandmark68Net.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model')),
    faceapi.nets.faceRecognitionNet.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'))
  ]);
  
  console.log('Modelli caricati con successo 2');
}

async function loadData(){
  all = await chrome.storage.local.get()
  return all;
}

(async () => {
  loadModels();
  all = loadData();

  const model = await faceapi.tf.loadGraphModel(chrome.runtime.getURL('modeljs/model.json'));

  function obscure(img) {
    img.src = chrome.runtime.getURL('icon.png');
  }

  const images = await document.querySelectorAll('img');
  /*const imageUrls = [];
  images.forEach((img) => {
      const url = img.src;
      imageUrls.push(url);
  });*/

  for (const image of images){
      if(image !== ""){
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
                      console.log(detection);
                      for (const [key, val] of Object.entries(all)){ 
                        descriptor2 = new Float32Array(Object.values(JSON.parse(val).descriptor));
                        const distance = await faceapi.euclideanDistance(detection.descriptor, descriptor2);
                        if(distance < 0.6){
                            obscure(image)
                            console.log("Sono la stessa persona");
                        }
                        else{
                            console.log("Non sono la stessa persona");
                        }
                        console.log(distance);
                      }
                  }
              }
          } catch (error) {
              console.error(error);
          }
      }
  }
})();

async function loadModels() {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model')),
      faceapi.nets.faceLandmark68Net.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model')),
      faceapi.nets.faceRecognitionNet.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'))
    ]);
    
    console.log('Modelli caricati con successo 2');
}

(async () => {
    loadModels();

    const images = document.querySelectorAll('img');
    const imageUrls = [];
    images.forEach((img) => {
        const url = img.src;
        imageUrls.push(url);
    });

    const model = await faceapi.tf.loadGraphModel(chrome.runtime.getURL('modeljs/model.json'));
    for (const image of imageUrls){
        if(image !== ""){
            const imageLoadPromise = new Promise((resolve, reject) => {
                const img1 = new Image();
                img1.onload = () => resolve(img1);
                img1.onerror = reject;
                img1.crossOrigin = 'anonymous'; 
                img1.src = image;
            });
            try {
                const img1 = await imageLoadPromise;
                const detection1 = await faceapi.detectAllFaces(img1).withFaceLandmarks().withFaceDescriptors();
                if(detection1.length > 0){
                    console.log(detection1);

                    all = await chrome.storage.local.get()
                    for (const [key, val] of Object.entries(all)){ 
                        const imageLoadPromise2 = new Promise((resolve, reject) => {
                            const img2 = new Image();
                            img2.onload = () => resolve(img2);
                            img2.onerror = reject;
                            img2.src = key;
                        });
                        
                        try {
                            const img2 = await imageLoadPromise2;
                            const detection2 = await faceapi.detectAllFaces(img2).withFaceLandmarks().withFaceDescriptors();
                            console.log(detection2)
                            console.log(detection1.length);
                            console.log(detection2.length);
                            const distance = await faceapi.euclideanDistance(detection1[0].descriptor, detection2[0].descriptor);
                            console.log(distance);
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }
            } catch (error) {
                console.error(error);
            }
        }
    }
})();
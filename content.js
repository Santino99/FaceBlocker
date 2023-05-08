async function loadModels() {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'))
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

    const images = document.querySelectorAll('img');

    //chrome.runtime.sendMessage({images: imageUrls});
    const model = await faceapi.tf.loadGraphModel(chrome.runtime.getURL('modeljs/model.json'));
    for (const image of images){
        if(image !== ""){
            const imageLoadPromise = new Promise((resolve, reject) => {
                const img1 = new Image();
                img1.onload = () => resolve(img1);
                img1.onerror = reject;
                img1.src = image.src;
                img1.crossOrigin = 'anonymous';
            });
            try {
                img1 = await imageLoadPromise;
                const detection = await faceapi.detectAllFaces(img1);
                if(detection.length > 0){
                    console.log(image)
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d',{willReadFrequently: true} );

                    canvas.width = 105;
                    canvas.height = 105;

                    context.drawImage(img1,
                        detection[0].box.x,
                        detection[0].box.y,
                        detection[0].box.width,
                        detection[0].box.height,
                    0, 0, 105, 105);    
                    
                    img1.src = canvas.toDataURL('image/jpeg');

                    for (const [key, val] of Object.entries(all)){ 
                        const imageLoadPromise2 = new Promise((resolve, reject) => {
                            const img2 = new Image();
                            img2.src = key;
                            img2.onload = () => resolve(img2);
                            img2.onerror = reject;
                        });
                        try {
                            img2 = await imageLoadPromise2;
                            img2.width = 105;
                            img2.height = 105;
                            
                            const imageData1 = img1;
                            //document.body.appendChild(imageData1);
                            const tensor1 = faceapi.tf.browser.fromPixels(imageData1);
                            const normalizedTensor1 = tensor1.cast("float32").div(faceapi.tf.scalar(255));
                            const batchedTensor1 = normalizedTensor1.expandDims(0, normalizedTensor1);

                            const imageData2 = img2
                            //document.body.appendChild(imageData2);
                            const tensor2 = faceapi.tf.browser.fromPixels(imageData2);
                            const normalizedTensor2 = tensor2.cast("float32").div(faceapi.tf.scalar(255));
                            const batchedTensor2 = normalizedTensor2.expandDims(0, normalizedTensor2);
                            

                            predictions = await model.execute([batchedTensor1, batchedTensor2]).data().then(results => {
                                console.log(results[0])
                                if(results[0]<0.5){
                                    console.log("Sono la stessa persona")
                                }
                                else{
                                    console.log("Non sono la stessa persona")
                                }
                            })
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


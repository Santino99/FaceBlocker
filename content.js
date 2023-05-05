async function loadModels() {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'))
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
    //chrome.runtime.sendMessage({images: imageUrls});
    const model = await faceapi.tf.loadGraphModel(chrome.runtime.getURL('modeljs/model.json'));
    for (const image of imageUrls){
        if(image !== ""){
            const img1 = new Image();
            img1.crossOrigin = 'anonymous'; 
            img1.src = image;
            const detection = await faceapi.detectSingleFace(img1);
            if(detection){
                console.log(image)
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d',{willReadFrequently: true} );

                canvas.width = 105;
                canvas.height = 105;

                context.drawImage(img1,
                    detection.box.x,
                    detection.box.y,
                    detection.box.width,
                    detection.box.height,
                0, 0, 105, 105);

                all = await chrome.storage.local.get()
                for (const [key, val] of Object.entries(all)){ 
                    const imageLoadPromise = new Promise((resolve, reject) => {
                        const img2 = new Image();
                        img2.onload = () => resolve(img2);
                        img2.onerror = reject;
                        img2.src = val;
                    });
                    
                    try {
                        const img2 = await imageLoadPromise;
                        const canvas2 = document.createElement('canvas');
                        const context2 = canvas2.getContext('2d');
                        canvas2.width = 105;
                        canvas2.height = 105;
                        context2.drawImage(img2, 0, 0, 105, 105);

                        const imageData1 = context.getImageData(0, 0, 105, 105);
                        const tensor1 = faceapi.tf.browser.fromPixels(imageData1);
                        const normalizedTensor1 = tensor1.cast('float32').div(255);
                        const batchedTensor1 = normalizedTensor1.expandDims();
                
                        const imageData2 = context2.getImageData(0, 0, 105, 105);
                        const tensor2 = faceapi.tf.browser.fromPixels(imageData2);
                        const normalizedTensor2 = tensor2.cast('float32').div(255);
                        const batchedTensor2 = normalizedTensor2.expandDims();
                        
                        predictions = await model.predict([await batchedTensor1, await batchedTensor2]).data().then(results => {
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

                    /*const canvas2 = document.createElement('canvas');
                    const  context2 = canvas2.getContext('2d', {willReadFrequently: true});
                    img2.onload = function(){
                        canvas2.width = 105;
                        canvas2.height = 105;
                        context2.drawImage(img2, 0, 0, 105, 105);
                        
                    }
                    console.log(img2);*/

                   // chrome.storage.local.set({['amici miei']: canvas2.toDataURL()});
                }
            }
        }
    }
})();


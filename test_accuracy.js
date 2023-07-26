async function loadModels() {
    await faceapi.nets.ssdMobilenetv1.loadFromUri('node_modules/@vladmandic/face-api/model');
    await faceapi.nets.tinyFaceDetector.loadFromUri('node_modules/@vladmandic/face-api/model');
    await faceapi.nets.faceLandmark68Net.loadFromUri('node_modules/@vladmandic/face-api/model');
    await faceapi.nets.faceRecognitionNet.loadFromUri('node_modules/@vladmandic/face-api/model');
    
    console.log("Modelli caricati con successo 2");
}

loadModels().then(async () => {
    const fileInput1 = document.getElementById('fileInput1');
    const button1 = document.getElementById('button1');

    const buttonSom = document.getElementById('buttonSimilarity');

    var detections = []
    var filenames = []

    button1.addEventListener('click', function(){
        fileInput1.click();
    })

    fileInput1.addEventListener('change', async (event) => {
        const files = event.target.files;
        for (const file of files) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                var img1 = new Image();
                img1.src = reader.result;
                const detection1 = await faceapi.detectAllFaces(img1).withFaceLandmarks().withFaceDescriptors();
                if(detection1.length > 0){
                    for (const detection of detection1){
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d', {willReadFrequently: true});
                        canvas.width = 105;
                        canvas.height = 105;
                        context.drawImage(img1,
                            detection.detection.box.x,
                            detection.detection.box.y,
                            detection.detection.box.width,
                            detection.detection.box.height,
                            0, 0, 105, 105
                        );
                        img1.src = canvas.toDataURL('image/jpeg');
                        canvas.remove();
                        detections.push(detection)
                    }
                }
                var link = document.createElement('a');
                link.href = img1.src;
                link.download = file.name;

                link.style.display = 'none';
                document.body.appendChild(link);
          
                link.click();
          
                document.body.removeChild(link);
                filenames.push(file.name)
            }
        }
    })

    buttonSom.addEventListener('click', async function(){
        const distance = await faceapi.euclideanDistance(detections[0].descriptor, detections[1].descriptor);
        console.log(filenames[0] + ", " + filenames[1] + ": " + distance);
        detections.pop();
        filenames.pop();
        detections.pop();
        filenames.pop();
    })
})

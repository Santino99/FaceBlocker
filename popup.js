class DistanceLayer extends faceapi.tf.layers.Layer {
    constructor() {
      super({});
    }
  
    call(inputs) {
      const [x1, x2] = inputs;
      return faceapi.tf.abs(faceapi.tf.sub(x1, x2));
    }
}

(async () => {

  async function detectFace(result){
    // await faceapi.nets.ssdMobilenetv1.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
    await faceapi.nets.ssdMobilenetv1.loadFromUri('node_modules/@vladmandic/face-api/model');

    const img = new Image();
    img.src = result;
    const detection = await faceapi.detectAllFaces(img);

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 105;
    canvas.height = 105;
    context.drawImage(img,
      detection[0].box.x,
      detection[0].box.y,
      detection[0].box.width,
      detection[0].box.height,
      0, 0, 105, 105);

    return canvas;
  }

  async function constructDivImage(readerResult, photo){
    const preview = document.getElementsByClassName('preview')[0];
    
    const container = document.createElement('div')
    container.className = 'container';
    container.style.position = 'relative';
    container.style.width = '150px';
    container.style.height = '150px';
    container.style.margin = '0px';
    container.style.padding = '0px';

    const img = new Image();
    img.src = photo;
    img.style.transition = '.3s ease';
  
    const x_div = document.createElement('div');
    x_div.className = 'topright';
    x_div.style.position = 'absolute';
    x_div.style.margin = '0px';
    x_div.style.top = '8px';
    x_div.style.right = '3px';
    x_div.style.fontSize = '18px';
  
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'icon';
    a.style.color = 'red';
    a.style.position = 'relative';
    a.style.fontSize = '25px';
    a.style.right = '10px';
    a.style.top = '5px';
    a.style.opacity = 0;
    a.style.transition = ".3s ease";
    
    const icon = document.createElement('icon');
    icon.className = 'fa-solid fa-x'
  
    a.onmouseover = function(){
      this.style.opacity = 1;
      img.style.opacity = 0.3;
    }
    
    a.onclick = function(){
      chrome.storage.local.remove(readerResult);
      preview.removeChild(container);
    }

    img.onmouseover = function(){
      a.style.opacity = 1;
      this.style.opacity = 0.3;
    }
  
    img.onmouseout = function(){
      a.style.opacity = 0;
      this.style.opacity = 1;
    }
  
    container.appendChild(img);
    a.appendChild(icon);
    x_div.appendChild(a);
    container.appendChild(x_div);
    preview.appendChild(container);
  
    return preview;
  }

  async function getImage(){
    const all = await chrome.storage.local.get();
    console.log(Object.entries(all).length)
    for (const [key, val] of Object.entries(all)){
      constructDivImage(key, val);
      /* FARE CONTROLLO SE CARICO LA STESSA IMMAGINE, ALLORA NON PRENDERLA*/
    } 
  }
  
  
  /*const img = document.getElementById('first-image')
  const img2 = document.getElementById('second-image')

  const detection = await faceapi.detectAllFaces(img)
  const detection2 = await faceapi.detectAllFaces(img2)

  const faceCanvas = document.getElementById('myCanvas')
  const faceCanvas2 = document.getElementById('myCanvas2')

  const faceContext = faceCanvas.getContext('2d');
  const faceContext2 = faceCanvas2.getContext('2d');

  faceCanvas.width = 105;
  faceCanvas.height = 105;

  faceCanvas2.width = 105;
  faceCanvas2.height = 105;

  faceContext.drawImage(img,
                        detection[0].box.x,
                        detection[0].box.y,
                        detection[0].box.width,
                        detection[0].box.height,
                        0, 0, 105, 105);

  const imageData1 = faceContext.getImageData(0, 0, 105, 105);
  const tensor1 = faceapi.tf.browser.fromPixels(imageData1);
  const normalizedTensor1 = tensor1.toFloat().div(255);
  const batchedTensor1 = normalizedTensor1.expandDims();
  
  faceContext2.drawImage(img2,
                        detection2[0].box.x,
                        detection2[0].box.y,
                        detection2[0].box.width,
                        detection2[0].box.height,
                        0, 0, 105, 105);

  const imageData2 = faceContext2.getImageData(0, 0, 105, 105); 
  const tensor2 = faceapi.tf.browser.fromPixels(imageData2);
  const normalizedTensor2 = tensor2.toFloat().div(255)
  const batchedTensor2 = normalizedTensor2.expandDims();
  
  const predictButton = document.getElementById('predict-button');

  const model = await faceapi.tf.loadGraphModel('modeljs/model.json');
  predictButton.addEventListener('click', async () => {
    predictions = await model.predict([await batchedTensor1, await batchedTensor2]).data().then(results => {
      console.log(results[0])
      if(results[0]<0.5){
        console.log("Sono la stessa persona")
      }
      else{
        console.log("Non sono la stessa persona")
      }
    })
  });*/

  document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementsByClassName('drop-zone')[0];
    const fileInput = document.getElementById('fileElem');
    const icon = document.getElementsByTagName('i')[0];
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      for (const file of files) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          detectFace(reader.result).then((res) => {
            const photo= res.toDataURL();
            divImage = constructDivImage(reader.result, photo);
            chrome.storage.local.set({[reader.result]: photo});
          })
        }
      }
    });

    fileInput.addEventListener('change', () => {
      const files = fileInput.files;
      for (const file of files) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          detectFace(reader.result).then((res) => {
            const photo= res.toDataURL();
            divImage = constructDivImage(reader.result, photo);
            chrome.storage.local.set({[reader.result]: photo});
          /*chrome.storage.local.clear(function() {
            console.log('Tutti i dati sono stati eliminati correttamente.');
          });*/
          });
        }
      }
    });
    
    icon.addEventListener('click', () => {
      fileInput.click();
    });

    getImage();
  });

  chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    DistanceLayer.className = 'Lambda';
    await faceapi.tf.serialization.registerClass(DistanceLayer);
    await faceapi.nets.ssdMobilenetv1.loadFromUri(chrome.runtime.getURL('node_modules/@vladmandic/face-api/model'));
    const model = await faceapi.tf.loadGraphModel(chrome.runtime.getURL('modeljs/model.json'));

    const images = request.images;
    //for (const image of images){
      if(images[1] !== ""){
        console.log(images[1]);
        const img1 = new Image();
        img1.src = images[1];
        img1.crossOrigin = 'anonymous';

        const detection = await faceapi.detectAllFaces(img1);
        console.log(detection);
        if(detection.length > 0){
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', {willReadFrequently: true});

          canvas.width = 105;
          canvas.height = 105;

          context.drawImage(img1,
            detection[0].box.x,
            detection[0].box.y,
            detection[0].box.width,
            detection[0].box.height,
            0, 0, 105, 105);

        // chrome.storage.local.set({[canvas.toDataURL()]: canvas.toDataURL()});
            //RISOLVERE URGENTE QUI
          const all = chrome.storage.local.get();
          
          all.then(function(data){
            for (const [key, val] of Object.entries(data)){ 
              const canvas2 = document.createElement('canvas');
              const context2 = canvas2.getContext('2d', {willReadFrequently: true});
              const img2 = new Image();
              img2.src = val;
              canvas2.width = 105;
              canvas2.height = 105;

              context2.drawImage(img2, 0, 0, 105, 105);
              
              chrome.storage.local.set({[canvas2.toDataURL()]: canvas2.toDataURL()});

              const imageData1 = context.getImageData(0, 0, 105, 105);
              const tensor1 = faceapi.tf.browser.fromPixels(imageData1);
              const normalizedTensor1 = tensor1.toFloat().div(255);
              const batchedTensor1 = normalizedTensor1.expandDims();
      
              const imageData2 = context2.getImageData(0, 0, 105, 105);
              const tensor2 = faceapi.tf.browser.fromPixels(imageData2);
              const normalizedTensor2 = tensor2.toFloat().div(255);
              const batchedTensor2 = normalizedTensor2.expandDims();
              
              predictions = model.predict([batchedTensor1, batchedTensor2]).data().then(results => {
                console.log(results[0])
                if(results[0]<0.5){
                  console.log("Sono la stessa persona")
                }
                else{
                  console.log("Non sono la stessa persona")
                }
              })
            }
        });
      }
    }
  });
})();





  
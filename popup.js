async function loadModels() {
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('node_modules/@vladmandic/face-api/model')
  ]);
  
  console.log('Modelli caricati con successo');
}

(async () => {

  loadModels();

  async function detectFace(result){
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

  function constructDivImage(readerResult, photo){
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
            const photo= res.toDataURL('image/jpeg');
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
            const photo = res.toDataURL('image/jpeg');
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
})();





  
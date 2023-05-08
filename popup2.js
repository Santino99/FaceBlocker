async function loadModels() {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri('node_modules/@vladmandic/face-api/model'),
      faceapi.nets.faceLandmark68Net.loadFromUri('node_modules/@vladmandic/face-api/model'),
      faceapi.nets.faceRecognitionNet.loadFromUri('node_modules/@vladmandic/face-api/model')
    ]);
    console.log('Modelli caricati con successo');
}
  
(async () => {

  loadModels();

  async function detectFace(result){
    const imageLoadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = result;
    });
    try {
      const img = await imageLoadPromise;
      const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
      /*CONTINUARE DA QUI CON  DESCRIPTOR*/
      canvases = [];
      for (const detection of detections){
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', {willReadFrequently: true});
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img,
          detection.detection.box.x,
          detection.detection.box.y,
          detection.detection.box.width,
          detection.detection.box.height,
          0, 0, img.width, img.height);
        canvases.push(canvas.toDataURL('image/jpeg'));

        console.log(detection)
        await chrome.storage.local.set({[canvas.toDataURL('image/jpeg')]: JSON.stringify(detection)});
      }
    } catch (error) {
      console.error(error);
    }
    return canvases;
  }

  function constructDivImage(photo){
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
      chrome.storage.local.remove(photo);
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
      constructDivImage(key);
      /* FARE CONTROLLO SE CARICO LA STESSA IMMAGINE, ALLORA NON PRENDERLA*/
    } 
  }

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
            for(const r of res){
              divImage = constructDivImage(r);
              //chrome.storage.local.set({[photo]: reader.result});
            }
          });
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
            for(const r of res){
              divImage = constructDivImage(r);
              //chrome.storage.local.set({[photo]: reader.result});
            }
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
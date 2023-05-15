async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromUri('node_modules/@vladmandic/face-api/model');
  await faceapi.nets.faceLandmark68Net.loadFromUri('node_modules/@vladmandic/face-api/model');
  await faceapi.nets.faceRecognitionNet.loadFromUri('node_modules/@vladmandic/face-api/model');

  console.log("Modelli caricati con successo");
}
/*
async function addContextImageToStorage(image){
  detectFace(image).then((res) => {
    for(const r of res){
      constructDivImage(r);
    }
  });
}*/
/*
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log(request.message);
});*/

async function addInputImageToStorage(image){
  await detectFace(image).then((res) => {
    for(const r of res){
      constructDivImage(r);
    }
  });
}

function areTheSameDescriptors(descriptors1, descriptors2){
  for(let i=0; i<descriptors1.length; i++){
    if(descriptors1[i] !== descriptors2[i]){
      return false;
    }
  }
  return true;
}

async function isInStorage(valToAdd){
  const all = await chrome.storage.local.get();
  for (const [key, val] of Object.entries(all)){
    console.log(valToAdd);
    console.log(new Float32Array(Object.values(JSON.parse(val))))
    if(areTheSameDescriptors(valToAdd, new Float32Array(Object.values(JSON.parse(val))))){
      console.log("sono uguali")
      return true;
    }
  }
  console.log("non sono uguali")
  return false;
}

async function detectFace(result){
  let canvases = [];
  const imageLoadPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = result;
  });
  try {
    await imageLoadPromise.then(async (img) => {
      const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
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
          0, 0, img.width, img.height
        );

        await isInStorage(detection.descriptor).then(async(res) => {
          console.log(res)
          if(!res){
            canvases.push(canvas.toDataURL('image/jpeg'));
            await chrome.storage.local.set({[canvas.toDataURL('image/jpeg')]: JSON.stringify(detection.descriptor)});
          }
        });
        canvas.remove();
      }
    }).then(() => {
      if(canvases.length !== 0){
        chrome.runtime.sendMessage('addedImage');
      }
      else{
        chrome.runtime.sendMessage('existingImage');
      }
    })
  } catch (error) {
    console.error(error);
  }  
  return canvases;
}

async function getImage(){
  const all = await chrome.storage.local.get();
  for (const [key, val] of Object.entries(all)){
    /*if(key.startsWith('savedImage')){
      addImageToStorage(val);
      await chrome.storage.local.remove(key);
    }
    else{*/
      constructDivImage(key);
   // }
  } 
}

document.addEventListener('DOMContentLoaded', function() {

  //const dropZone = document.getElementsByClassName('drop-zone')[0];
  //const fileInput = document.getElementById('fileElem');
 // const icon = document.getElementsByTagName('i')[0];
  const addFolder = document.getElementById('add-button');

  /*dropZone.addEventListener('dragover', (e) => {
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
        addInputImageToStorage(reader.result);
      }
    }
  });

  fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    for (const file of files) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        addInputImageToStorage(reader.result);
      }
    }
  });
  
  icon.addEventListener('click', () => {
    fileInput.click();
  });*/

  addFolder.addEventListener('click', () => {
    constructCardFolder();
  });
});

function constructCardFolder(){
  const preview = document.getElementsByClassName('preview')[0];

  const div1 = document.createElement('div');
  div1.className = "card";
  div1.style.width = '150px';

  const img = new Image();
  img.className = "card-img-top";
  img.src = "folder.png";

  const div2 = document.createElement('div');
  div2.className = "card-body";

  const input = document.createElement('input');
  input.type = "text";
  input.style.width = '120px';
  input.placeholder = "Scegli un nome";

  const hr = document.createElement('hr');

  const a = document.createElement('a');
  a.href = "#";
  a.className = "btn btn-primary";
  a.textContent = "Rileva";

  div2.appendChild(input);
  div2.appendChild(hr);
  div2.appendChild(a);

  div1.appendChild(img);
  div1.appendChild(div2);

  preview.appendChild(div1);
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
}

(async () => {
  await loadModels();
  await getImage();  
})();
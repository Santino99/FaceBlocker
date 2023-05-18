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

async function addInputImageToStorage(divId, image, filename){
  //const iconBackwards = document.getElementsByTagName('i')[0];
 // iconBackwards.disabled = true;
  await detectFace(divId, image, filename).then((res) => {
    for(const r of res){
      constructDivImage(divId, r);
    }
  });//.then(iconBackwards.disabled = false);
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
    if(key.startsWith('imageOfDiv')){
      if(areTheSameDescriptors(valToAdd, new Float32Array(Object.values(JSON.parse(val[1]))))){
        return true;
      }
    }
  }
  return false;
}

async function detectFace(divId, result, filename){
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
          if(!res){
            canvases.push(canvas.toDataURL('image/jpeg'));
            await chrome.storage.local.set({['imageOfDiv'+divId+canvas.toDataURL('image/jpeg')/*JSON.stringify(detection.descriptor)*/]: [canvas.toDataURL('image/jpeg'), JSON.stringify(detection.descriptor)]});
          }
        });
        canvas.remove();
      }
    }).then(() => {
      if(canvases.length !== 0){
        chrome.runtime.sendMessage({type: 'addedImage', content: filename}, (response) => {
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

async function getFolders(){
  const all = await chrome.storage.local.get();
  for (const [key, val] of Object.entries(all)){
    if(key.startsWith('div')){
      constructCardFolder(key, val[0], val[1], val[2], val[3]);
    }
  }
}

async function getImages(divId){
  const all = await chrome.storage.local.get();
  for (const [key, val] of Object.entries(all)){
    if(key.startsWith('savedImage')){
      //addImageToStorage(val);
      //await chrome.storage.local.remove(key);
    }
    else if(key.startsWith('imageOfDiv'+divId)){
      constructDivImage(divId, val[0]);
    }
  } 
}

function removeAllChildNodes(parent) {
  while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  
  const addFolder = document.getElementById('add-button');
  
  addFolder.addEventListener('click', () => {
    const divId = new Date().getTime();
    const imgSrc = "folder.png";

    chrome.runtime.sendMessage({type: 'getCounter'}, (response) => {
      const inputValue = "Folder " + response;
      const bTextContent = "On";
      const bClassName = "btn btn-success";
      constructCardFolder("div"+divId, imgSrc, inputValue, bTextContent, bClassName).then(() => {
        chrome.storage.local.set({["div"+divId]: [imgSrc, inputValue, bTextContent, bClassName]});
      });
      chrome.runtime.sendMessage({type: 'addedFolderForContext', content: 'div'+divId}, (response) => {
        if(response === true){
          console.log("Cartella aggiunta");
        }
        else{
          console.log("Errore nell'aggiunta della cartella");
        }
      });
    });
  });
});

async function initializeDropAreaListeners(divId){
  const iconBackwards = document.getElementsByTagName('i')[0];
  const dropZone = document.getElementsByClassName('drop-zone')[0];
  const fileInput = document.getElementById('fileElem');
  const iconUpload = document.getElementsByTagName('i')[1];

  dragover = function(event){
    event.preventDefault();
  };

  drop = function(event){
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const files = event.dataTransfer.files;
    for (const file of files) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        addInputImageToStorage(divId, reader.result);
      }
    }
  };

  change = function(){
    const files = fileInput.files;
    for (const file of files) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        addInputImageToStorage(divId, reader.result, file.name);
      }
    }
  };

  click = function(){
    fileInput.click();
  };

  dropZone.addEventListener('dragover', dragover);
  dropZone.addEventListener('drop', drop);
  fileInput.addEventListener('change', change);
  iconUpload.addEventListener('click', click);

  iconBackwards.addEventListener('click', () => {
    const divFolders = document.getElementById('folders-area');
    const divImages = document.getElementById('drop-area');

    const previewImages = document.getElementsByClassName('preview')[1];
    removeAllChildNodes(previewImages);

    dropZone.removeEventListener('dragover', dragover);
    dropZone.removeEventListener('drop', drop);
    fileInput.removeEventListener('change', change);
    iconUpload.removeEventListener('click', click);

    divImages.setAttribute('hidden', 'hidden');
    divFolders.removeAttribute('hidden')
  });
}

async function constructCardFolder(divId, imgSrc, inputValue, bTextContent, bClassName){
  const preview = document.getElementsByClassName('preview')[0];

  const div1 = document.createElement('div');
  div1.id = divId;
  div1.className = "card";
  div1.style.width = '150px';

  const img = new Image();
  img.className = "card-img-top";
  img.src = imgSrc;
  img.addEventListener('click', () => {
    initializeDropAreaListeners(divId).then(()=>{
      getImages(divId);
    });
    const divFolders = document.getElementById('folders-area');
    const divImages = document.getElementById('drop-area');
    divFolders.setAttribute('hidden', 'hidden');
    divImages.removeAttribute('hidden')
  })  

  const div2 = document.createElement('div');
  div2.className = "card-body";

  const input = document.createElement('input');
  input.type = "text";
  input.style.width = '120px';
  input.placeholder = "Scegli un nome";
  input.style.border = "None";
  input.value = inputValue;

  input.addEventListener("change", (event) => {
    chrome.storage.local.set({[divId]: [img.src, event.target.value, button1.textContent, button1.className]}).then(()=>{
      chrome.runtime.sendMessage({type: 'updateFolderForContext', content: divId}, (response) => {
        if(response === true){
          console.log("Cartella aggiunta");
        }
        else{
          console.log("Errore nell'aggiunta della cartella");
        }
      });
    });
  });

  const hr = document.createElement('hr');

  const button1 = document.createElement('button');
  button1.className = bClassName;
  button1.style.height = '40px';
  button1.textContent = bTextContent;

  button1.addEventListener('click', (event) => {
    if(event.target.textContent === 'On'){
      button1.className = "btn btn-danger";
      button1.textContent = "Off"
      chrome.storage.local.set({[divId]: [img.src, input.value, button1.textContent, button1.className]})
    }
    else if(event.target.textContent === 'Off'){
      button1.className = "btn btn-success";
      button1.textContent = "On"
      chrome.storage.local.set({[divId]: [img.src, input.value, button1.textContent, button1.className]})
    }
  })

  const button2 = document.createElement('button');
  button2.style.height = '40px';
  button2.style.position = 'relative';
  button2.style.left = '30px';
  button2.className = "btn btn-danger";

  button2.addEventListener('click', () => {
    chrome.runtime.sendMessage({type: 'removedFolderForContext', content: divId}, (response) => {
      if(response === true){
        chrome.storage.local.get().then((all) => {
          for(const key of Object.keys(all)){
            if(key.startsWith('imageOfDiv'+divId)){
              chrome.storage.local.remove(key);
            }
          }
        }).then(() => {
          chrome.storage.local.remove(divId).then(() => {
            preview.removeChild(div1);
            console.log("Cartella rimossa");
          });
        });
      }
      else{
        console.log("Errore nella rimozione della cartella");
      }
    });
  }, {once: true});

  const icon = document.createElement('icon');
  icon.className = "fa fa-x";

  button2.appendChild(icon);

  div2.appendChild(input);
  div2.appendChild(hr);
  div2.appendChild(button1);
  div2.appendChild(button2);

  div1.appendChild(img);
  div1.appendChild(div2);

  preview.appendChild(div1);
}

function constructDivImage(divId, photo){
  const preview = document.getElementsByClassName('preview')[1];
  
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
    chrome.storage.local.remove('imageOfDiv'+divId+photo);
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
  await getFolders();  
})();
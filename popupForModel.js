async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromUri('node_modules/@vladmandic/face-api/model');

  console.log("Modelli caricati con successo");
}

async function addImageToStorage(divId, image, filename){
  await detectFace(divId, image, filename).then((res) => {
    for(const r of res){
      constructDivImage(divId, r);
    }
  });
}

async function detectFace(divId, result, filename){
  let canvases = [];
  let noDetection = false;

  const imageLoadPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = result;
  });
  try {
    await imageLoadPromise.then(async (img) => {
      const detections = await faceapi.detectAllFaces(img);
      if(detections.length > 0){
        for (const detection of detections){
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', {willReadFrequently: true});
          canvas.width = 105;
          canvas.height = 105;
          context.drawImage(img,
            detection.box.x,
            detection.box.y,
            detection.box.width,
            detection.box.height,
            0, 0, 105, 105
          );
          canvases.push(canvas.toDataURL('image/jpeg'));
          await chrome.storage.local.set({['imageOfFolder'+divId+canvas.toDataURL('image/jpeg')]: canvas.toDataURL('image/jpeg')});
          canvas.remove();
        }
      }
      else{
        noDetection = true;
      }
    }).then(() => {
      if(canvases.length !== 0 && !noDetection){
        chrome.runtime.sendMessage({type: 'addedImage', content: filename}, (response) => {
          if(response){
            console.log("Ok");
          }
        });
      }
      else if(noDetection){
        chrome.runtime.sendMessage({type: 'noDetection', content: filename}, (response) => {
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
    if(key.startsWith('folder')){
      constructCardFolder(key, val[0], val[1], val[2], val[3]);
    }
  }
}

async function getImages(divId){
  const all = await chrome.storage.local.get();
  for (const [key, val] of Object.entries(all)){
    if(key.startsWith('savedImage')){
      addImageToStorage(val[1], val[0], "catturata").then(chrome.storage.local.remove(key));
    }
    else if(key.startsWith('imageOfFolder'+divId)){
      constructDivImage(divId, val);
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

    const inputValue = "Empty folder";
    const bTextContent = "On";
    const bClassName = "btn btn-success";
    constructCardFolder("folder"+divId, imgSrc, inputValue, bTextContent, bClassName).then(() => {
      chrome.storage.local.set({["folder"+divId]: [imgSrc, inputValue, bTextContent, bClassName]});
    });
    chrome.runtime.sendMessage({type: 'addedFolderForContext', content: 'folder'+divId}, (response) => {
      if(response === true){
        console.log("Cartella aggiunta");
      }
      else{
        console.log("Errore nell'aggiunta della cartella");
      }
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
        addImageToStorage(divId, reader.result);
      }
    }
  };

  change = function(){
    const files = fileInput.files;
    for (const file of files) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        addImageToStorage(divId, reader.result, file.name);
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
            if(key.startsWith('imageOfFolder'+divId)){
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
    chrome.storage.local.remove('imageOfFolder'+divId+photo);
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





  
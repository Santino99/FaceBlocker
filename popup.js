const noFolder = document.getElementById('noFolder');
const noImages = document.getElementById('noImages');
const tinyModelButton = document.getElementById('tiny-model');
const biggerModelButton = document.getElementById('bigger-model'); 
const autoModelButton = document.getElementById('auto-model'); 
const onButton = document.getElementById('on-button');
const offButton = document.getElementById('off-button'); 
const loadingDiv = document.getElementById('loading');

async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromUri('node_modules/@vladmandic/face-api/model');
  await faceapi.nets.faceLandmark68Net.loadFromUri('node_modules/@vladmandic/face-api/model');
  await faceapi.nets.faceRecognitionNet.loadFromUri('node_modules/@vladmandic/face-api/model');

  console.log("Modelli caricati con successo");
}

async function thereIsFolders(){
  const all = await chrome.storage.local.get();
  for (const [key, val] of Object.entries(all)){
    if(key.startsWith('folder')){
      return true;
    }
  }
  return false;
}

async function thereIsImages(divId){
  const all = await chrome.storage.local.get();
  for (const [key, val] of Object.entries(all)){
    if(key.startsWith('imageOfFolder'+divId)){
      return true;
    }
  }
  return false;
}

async function addImageToStorage(divId, image, filename){
  await detectFace(image, filename).then(async (response) => {
    for(let i=0; i<response[0].length; i++){
      isInStorage('imageOfFolder'+divId+response[0][i]).then((result) => {
        if(!result){
          chrome.storage.local.set({['imageOfFolder'+divId+response[0][i]]: [response[0][i], JSON.stringify(response[1][i])]}).then(() => {
            constructDivImage(divId, response[0][i]);
          });
        }
      })
    }
  }).then(() => {
    loadingDiv.setAttribute('hidden', 'hidden');
  });
}

async function isInStorage(keyToAdd){
  all = await chrome.storage.local.get();
  for (const [key, val] of Object.entries(all)){
    if(key === keyToAdd){
      return true;
    }
  }
  return false;
}

async function detectFaceForFolders(result, filename){
  let face;
  let descriptor;
  let noDetection = false;
  let moreDetections = false;

  const imageLoadPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = 'anonymous';
    img.src = result;
  });
  try {
    await imageLoadPromise.then(async (img) => {
      const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
      if(detections.length === 1){
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', {willReadFrequently: true});
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img,
          detections[0].detection.box.x,
          detections[0].detection.box.y,
          detections[0].detection.box.width,
          detections[0].detection.box.height,
          0, 0, img.width, img.height
        );
        face = canvas.toDataURL('image/jpeg');
        descriptor = detections[0].descriptor;
        canvas.remove();
      }
      else if(detections.length === 0){
        noDetection = true;
      }
      else if(detections.length > 1){
        moreDetections = true;
      }
    }).then(() => {
      if(noDetection){
        chrome.runtime.sendMessage({type: 'noDetection', content: filename}, (response) => {
          if(response){
            console.log("Ok");
          }
        });
      }
      else if(moreDetections){
        chrome.runtime.sendMessage({type: 'moreDetections', content: filename}, (response) => {
          if(response){
            console.log("Ok");
          }
        });
      }
    })
  } catch (error) {
    console.error(error);
  }  
  return [face, descriptor];
}

async function detectFace(result, filename){
  let canvases = [];
  let descriptors = [];
  let noDetection = false;

  const imageLoadPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = 'anonymous';
    img.src = result;
  });
  try {
    await imageLoadPromise.then(async (img) => {
      const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
      if(detections.length > 0){
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
          canvases.push(canvas.toDataURL('image/jpeg'));
          descriptors.push(detection.descriptor);
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
    })
  } catch (error) {
    console.error(error);
  }  

  return [canvases, descriptors];
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
    if(key.startsWith('imageOfFolder'+divId)){
      constructDivImage(divId, val[0]);
    }
  } 
}

function removeAllChildNodes(parent) {
  while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
  }
}

async function setModels(){
  const model = await chrome.storage.local.get("activeModel");
  if(Object.values(model).length === 0){
    chrome.storage.local.set({"activeModel": 'tiny'})
  }
  else if(Object.values(model)[0] === "tiny"){
    biggerModelButton.classList.remove('active');
    autoModelButton.classList.remove('active');
    tinyModelButton.classList.add('active')

  }
  else if(Object.values(model)[0] === "bigger"){
    tinyModelButton.classList.remove('active');
    autoModelButton.classList.remove('active');
    biggerModelButton.classList.add('active')
  }
  else if(Object.values(model)[0] === "auto"){
    tinyModelButton.classList.remove('active');
    biggerModelButton.classList.remove('active')
    autoModelButton.classList.add('active');
  }
}

function updateButtonCardFolder(key, mode){
  div = document.getElementById(key);
  button = div.childNodes[1].childNodes[2];
  if(mode === "On"){
    button.classList.remove("btn-danger");
    button.classList.add("btn-success");
    button.innerText = mode;
  }
  else if(mode === "Off"){
    button.classList.add("btn-danger");
    button.classList.remove("btn-success");
    button.innerText = mode;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  setModels();

  const dropZoneFolders = document.getElementById('drop-zone-folders');
  const chooseFaceFolder= document.getElementById('choose-face-folder');
  const uploadFaceFolder = document.getElementById('upload-face-folder');

  dragover = function(event){
    event.preventDefault();
  };

  drop = function(event){
    event.preventDefault();
    dropZoneFolders.classList.remove('dragover');
    const files = event.dataTransfer.files;
    for (const file of files) {
      loadingDiv.removeAttribute('hidden');
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        detectFaceForFolders(reader.result, file.name).then((response) => {
          if(response[0] !== undefined){
            const divId = new Date().getTime();
            const imgSrc = response[0];
            const inputValue = "Empty folder";
            const bTextContent = "On";
            const bClassName = "btn btn-success";
            constructCardFolder("folder"+divId, imgSrc, inputValue, bTextContent, bClassName).then(async () => {
              await chrome.storage.local.set({["folder"+divId]: [imgSrc, inputValue, bTextContent, bClassName]});
              await chrome.storage.local.set({['imageOfFolderfolder'+divId+response[0]]: [response[0], JSON.stringify(response[1])]});
            });
            chrome.runtime.sendMessage({type: 'addedFolderForContext', content: 'folder'+divId}, (response) => {
              if(response === true){
                chrome.runtime.sendMessage({type: 'addedFolderFromContext'}, (response) => {
                  if(response === true){
                    console.log("Cartella aggiunta");
                    noFolder.setAttribute('hidden','hidden');
                  }
                  else{
                    console.log("Errore nell'aggiunta della cartella");
                  }
                });
              }
              else{
                console.log("Errore nell'aggiunta della cartella");
              }
            });
          }
        }).then(() => {
          loadingDiv.setAttribute('hidden','hidden');
        });
      }
    }
  };

  change = function(){
    const files = chooseFaceFolder.files;
    if(files.length > 0){
      for (const file of files) {
        loadingDiv.removeAttribute('hidden');
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          detectFaceForFolders(reader.result, file.name).then((response) => {
            if(response[0] !== undefined){
              const divId = new Date().getTime();
              const imgSrc = response[0];
              const inputValue = "Empty folder";
              const bTextContent = "On";
              const bClassName = "btn btn-success";
              constructCardFolder("folder"+divId, imgSrc, inputValue, bTextContent, bClassName).then(async () => {
                await chrome.storage.local.set({["folder"+divId]: [imgSrc, inputValue, bTextContent, bClassName]});
                await chrome.storage.local.set({['imageOfFolderfolder'+divId+response[0]]: [response[0], JSON.stringify(response[1])]});
              });
              chrome.runtime.sendMessage({type: 'addedFolderForContext', content: 'folder'+divId}, (response) => {
                if(response === true){
                  chrome.runtime.sendMessage({type: 'addedFolderFromContext'}, (response) => {
                    if(response === true){
                      console.log("Cartella aggiunta");
                      loadingDiv.setAttribute('hidden','hidden');
                      noFolder.setAttribute('hidden','hidden');
                    }
                    else{
                      loadingDiv.setAttribute('hidden','hidden');
                      console.log("Errore nell'aggiunta della cartella");
                    }
                  });
                }
                else{
                  loadingDiv.setAttribute('hidden','hidden');
                  console.log("Errore nell'aggiunta della cartella");
                }
              });
            }
          }).then(() => {
            loadingDiv.setAttribute('hidden','hidden');
          });;
        }
      }
    }
  };

  click = function(){
    chooseFaceFolder.click();
  };

  dropZoneFolders.addEventListener('dragover', dragover);
  dropZoneFolders.addEventListener('drop', drop);
  chooseFaceFolder.addEventListener('change', change);
  uploadFaceFolder.addEventListener('click', click);

  tinyModelButton.addEventListener('click', () => {
    if(biggerModelButton.classList.contains('active') || (autoModelButton.classList.contains('active'))){
      biggerModelButton.classList.remove('active');
      autoModelButton.classList.remove('active');
      tinyModelButton.classList.add('active')
      chrome.storage.local.set({"activeModel": 'tiny'})
    }
  });

  biggerModelButton.addEventListener('click', () => {
    if(tinyModelButton.classList.contains('active') || (autoModelButton.classList.contains('active'))){
      tinyModelButton.classList.remove('active');
      autoModelButton.classList.remove('active');
      biggerModelButton.classList.add('active')
      chrome.storage.local.set({"activeModel": 'bigger'})
    }
  });

  autoModelButton.addEventListener('click', () => {
    if(tinyModelButton.classList.contains('active') || (biggerModelButton.classList.contains('active'))){
      tinyModelButton.classList.remove('active');
      biggerModelButton.classList.remove('active');
      autoModelButton.classList.add('active')
      chrome.storage.local.set({"activeModel": 'auto'})
    }
  });

  onButton.addEventListener('click', () => {
    chrome.storage.local.get().then((all) => {
      for (const [key, val] of Object.entries(all)){
        if(key.startsWith('folder')){
          chrome.storage.local.set({[key]: [val[0], val[1], "On", "btn btn-success"]}).then(() => {
            updateButtonCardFolder(key, "On");
          });
        }
      }
    })
  });

  offButton.addEventListener('click', () => {
    chrome.storage.local.get().then((all) => {
      for (const [key, val] of Object.entries(all)){
        if(key.startsWith('folder')){
          chrome.storage.local.set({[key]: [val[0], val[1], "Off", "btn btn-danger"]}).then(() => {
            updateButtonCardFolder(key, "Off");
          });
        }
      }
    })
  });

  thereIsFolders().then((response) => {
    if(response){
      noFolder.setAttribute('hidden','hidden')
    }
    else{
      noFolder.removeAttribute('hidden')
    }
  })
  getFolders();
});

async function initializeDropAreaListeners(divId){
  const buttonBack = document.getElementById('back')
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('choose-face');
  const iconUpload = document.getElementById('upload-face');

  dragover = function(event){
    event.preventDefault();
  };

  drop = function(event){
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const files = event.dataTransfer.files;
    loadingDiv.removeAttribute('hidden');
    for (const file of files) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        noImages.setAttribute('hidden','hidden');
        addImageToStorage(divId, reader.result, file.name);
      }
    }
  };

  change = function(){
    const files = fileInput.files;
    if(files.length > 0){
      loadingDiv.removeAttribute('hidden');
      for (const file of files) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          noImages.setAttribute('hidden','hidden');
          addImageToStorage(divId, reader.result, file.name);
        }
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

  buttonBack.addEventListener('click', () => {
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
  img.draggable = false;
  img.src = imgSrc;
  img.style.width = '150px';
  img.style.height = '150px';
  img.addEventListener('click', () => {
    initializeDropAreaListeners(divId).then(()=>{
      thereIsImages(divId).then((response) => {
        if(response){
          noImages.setAttribute('hidden','hidden')
        }
        else{
          noImages.removeAttribute('hidden')
        }
      })
      getImages(divId);
    });
    const divFolders = document.getElementById('folders-area');
    const divImages = document.getElementById('drop-area');
    divFolders.setAttribute('hidden', 'hidden');
    divImages.removeAttribute('hidden')
  })  

  img.addEventListener('contextmenu', function(event){
    event.preventDefault();
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
            thereIsFolders().then((response) => {
              if(response){
                noFolder.setAttribute('hidden','hidden')
              }
              else{
                noFolder.removeAttribute('hidden')
              }
            })
          });
        });
      }
      else{
        console.log("Errore nella rimozione della cartella");
      }
    });
  }, {once: true});

  const icon = document.createElement('icon');
  icon.className = "fa fa-trash";

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
  img.draggable = false;
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
    chrome.storage.local.remove('imageOfFolder'+divId+photo).then(()=>{
      thereIsImages(divId).then((response) => {
        if(response){
          noImages.setAttribute('hidden','hidden')
        }
        else{
          noImages.removeAttribute('hidden')
        }
      })
      preview.removeChild(container);
    });
  }

  img.onmouseover = function(){
    a.style.opacity = 1;
    this.style.opacity = 0.3;
  }

  img.onmouseout = function(){
    a.style.opacity = 0;
    this.style.opacity = 1;
  }

  img.addEventListener('contextmenu', function(event){
    event.preventDefault();
  })
  
  container.appendChild(img);
  a.appendChild(icon);
  x_div.appendChild(a);
  container.appendChild(x_div);
  preview.appendChild(container);
}

(async () => {
  await loadModels();
})();
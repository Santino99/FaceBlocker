const noFolder = document.getElementById('noFolder');
const noImages = document.getElementById('noImages');
const tinyModelButton = document.getElementById('tiny-model');
const biggerModelButton = document.getElementById('bigger-model'); 
const autoModelButton = document.getElementById('auto-model'); 
const onButton = document.getElementById('on-button');
const offButton = document.getElementById('off-button'); 
const loadingDiv = document.getElementById('loading');

async function loadModels() {
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri('node_modules/@vladmandic/face-api/model'),
      faceapi.nets.faceLandmark68Net.loadFromUri('node_modules/@vladmandic/face-api/model'),
      faceapi.nets.faceRecognitionNet.loadFromUri('node_modules/@vladmandic/face-api/model')
    ]);
  } catch (error) {
    console.error(error);
  }
}

async function thereIsFolders(){
  try {
    const all = await chrome.storage.local.get();
    for (const key of Object.keys(all)){
      if(key.startsWith('folder')){
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(error);
  }
}

async function thereIsImages(divId){
  try {
    const all = await chrome.storage.local.get();
    for (const key of Object.keys(all)){
      if(key.startsWith('imageOfFolder'+divId)){
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(error);
  }
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
    });
  } catch (error) {
    console.error(error);
  }  
  return [face, descriptor];
}

async function detectFace(result, filename){
  let faces = [];
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
      console.log(detections);
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
          faces.push(canvas.toDataURL('image/jpeg'));
          descriptors.push(detection.descriptor);
          canvas.remove();
        }
      }
      else{
        noDetection = true;
      }
    }).then(() => {
      if(noDetection){
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

  return [faces, descriptors];
}

async function getFolders(){
  try{
    const all = await chrome.storage.local.get();
    for (const [key, val] of Object.entries(all)){
      if(key.startsWith('folder')){
        constructCardFolder(key, val[0], val[1], val[2], val[3]);
      }
    }
    loadingDiv.setAttribute('hidden', 'hidden');
  } catch (error) {
    console.error(error);
  }  
}

async function getImages(divId){
  try{
    const all = await chrome.storage.local.get();
    for (const [key, val] of Object.entries(all)){
      if(key.startsWith('imageOfFolder'+divId)){
        constructDivImage(divId, val[0]);
      }
    } 
    loadingDiv.setAttribute('hidden', 'hidden');
  } catch (error) {
    console.error(error);
  }  
}

function removeAllChildNodes(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

async function setModels(){
  try{
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
  } catch (error) {
    console.error(error);
  }  
}

function updateButtonCardFolder(key, mode){
  div = document.getElementById(key);
  let button = div.childNodes[1].childNodes[2];
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
  addLoadingDiv("Loading models...");
  loadModels().then(() => {
    setModels();
    thereIsFolders().then((response) => {
      if(response){
        noFolder.setAttribute('hidden','hidden');
        addLoadingDiv("Loading folders...");
      }
      else{
        noFolder.removeAttribute('hidden');
        loadingDiv.setAttribute('hidden','hidden');
      }
    })
    getFolders();

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
      const promises = [];
      addLoadingDiv("Folder creation in progress. Don't close the popup window");
      for (const file of files) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        const promise = new Promise((resolve) => {
          reader.onload = () => {
            detectFaceForFolders(reader.result, file.name).then((response) => {
              if(response[0] !== undefined){
                noFolder.setAttribute('hidden','hidden');
                const divId = new Date().getTime();
                const imgSrc = response[0];
                const inputValue = "Empty folder";
                const bTextContent = "On";
                const bClassName = "btn btn-success";
                chrome.storage.local.set({["folder"+divId]: [imgSrc, inputValue, bTextContent, bClassName]}).then(async() => {
                  try{
                    await chrome.storage.local.set({['imageOfFolderfolder'+divId+response[0]]: [response[0], JSON.stringify(response[1])]});
                    constructCardFolder("folder"+divId, imgSrc, inputValue, bTextContent, bClassName);
                    chrome.runtime.sendMessage({type: 'addedFolder'}, (response) => {
                      if(response === true){
                        console.log("Cartella aggiunta");
                      }
                      else{
                        console.log("Errore nell'aggiunta della cartella");
                      }
                    });
                    chrome.runtime.sendMessage({type: 'addedFolderForContext', content: 'folder'+divId}, (response) => {
                      if(response === true){
                        console.log("Cartella aggiunta al menu contestuale");
                      }
                      else{
                        console.log("Errore nell'aggiunta della cartella");
                      }
                    });
                  } catch (error) {
                    console.error(error);
                  }  
                });
              }
              resolve();
            });
          }
        });
        promises.push(promise);
      }
      Promise.all(promises).then(() => {
        loadingDiv.setAttribute('hidden', 'hidden');
      });
    };

    change = function(){
      const files = chooseFaceFolder.files;
      if(files.length > 0){
        const promises = [];
        addLoadingDiv("Folder creation in progress. Don't close the popup window");
        for (const file of files) {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          const promise = new Promise((resolve) => {
            reader.onload = () => {
              detectFaceForFolders(reader.result, file.name).then((response) => {
                if(response[0] !== undefined){
                  noFolder.setAttribute('hidden','hidden');
                  const divId = new Date().getTime();
                  const imgSrc = response[0];
                  const inputValue = "Empty folder";
                  const bTextContent = "On";
                  const bClassName = "btn btn-success";
                  chrome.storage.local.set({["folder"+divId]: [imgSrc, inputValue, bTextContent, bClassName]}).then(async() => {
                    try{
                      await chrome.storage.local.set({['imageOfFolderfolder'+divId+response[0]]: [response[0], JSON.stringify(response[1])]});
                      constructCardFolder("folder"+divId, imgSrc, inputValue, bTextContent, bClassName);
                      chrome.runtime.sendMessage({type: 'addedFolder'}, (response) => {
                        if(response === true){
                          console.log("Cartella aggiunta");
                        }
                        else{
                          console.log("Errore nell'aggiunta della cartella");
                        }
                      });
                      chrome.runtime.sendMessage({type: 'addedFolderForContext', content: 'folder'+divId}, (response) => {
                        if(response === true){
                          console.log("Cartella aggiunta al menu contestuale");
                        }
                        else{
                          console.log("Errore nell'aggiunta della cartella");
                        }
                      });
                    } catch (error) {
                      console.error(error);
                    }  
                  });
                }
                resolve();
              })
            }
          })
          promises.push(promise);
        }
        Promise.all(promises).then(() => {
          loadingDiv.setAttribute('hidden', 'hidden');
        });
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
  });
});

async function isInStorage(keyToAdd){
  try{
    all = await chrome.storage.local.get();
    for (const key of Object.keys(all)){
      if(key === keyToAdd){
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(error);
  }  
}

function addLoadingDiv(text){
  let p = loadingDiv.lastElementChild.lastElementChild;
  p.innerText = text;
  loadingDiv.removeAttribute('hidden');
}

async function initializeDropAreaListeners(divId){
  const buttonBack = document.getElementById('back')
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('choose-face');
  const iconUpload = document.getElementById('upload-face');

  dragover = function(event){
    event.preventDefault();
  };

  function processFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        detectFace(reader.result, file.name).then((response) => {
          if(response[0].length > 0){
            for(let i=0; i<response[0].length; i++){
              isInStorage('imageOfFolder'+divId+response[0][i]).then((result) => {
                if(!result){
                  noImages.setAttribute('hidden','hidden');
                  chrome.storage.local.set({['imageOfFolder'+divId+response[0][i]]: [response[0][i], JSON.stringify(response[1][i])]}).then(() => {
                    constructDivImage(divId, response[0][i]);
                    chrome.runtime.sendMessage({type: 'addedImage', content: file.name}, (response) => {
                      if(response){
                        console.log("Ok");
                      }
                    });
                  });
                }
                resolve();
              })
            }
          }
          else{
            resolve();
          }
        });
      }
    });
  }

  drop = async function(event){
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const files = event.dataTransfer.files;
    addLoadingDiv("Importing images in progress. Don't close the popup window");
    const promises = [];
    for (const file of files) {
      try{ 
        let promise = await processFile(file);
        promises.push(promise);
      } catch (error) {
        console.error(error);
      }  
    }
    Promise.all(promises).then(() => {
      loadingDiv.setAttribute('hidden', 'hidden');
    });
  };

  change = async function(){
    const files = fileInput.files;
    if(files.length > 0){
      addLoadingDiv("Importing images in progress. Don't close the popup window");
      const promises = [];
      for (const file of files) {
        try{
          let promise = await processFile(file);
          promises.push(promise);
        } catch (error) {
          console.error(error);
        }  
      }
      Promise.all(promises).then(() => {
        loadingDiv.setAttribute('hidden', 'hidden');
      });
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

function constructCardFolder(divId, imgSrc, inputValue, bTextContent, bClassName){
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
          noImages.setAttribute('hidden','hidden');
          addLoadingDiv("Loading faces");
        }
        else{
          noImages.removeAttribute('hidden');
          loadingDiv.setAttribute('hidden','hidden');
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
    const i = button2.firstElementChild;
    icon.className = "fas fa-circle-notch fa-spin";
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
  
  a.addEventListener('click', () => {
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
  }, {once: true});

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
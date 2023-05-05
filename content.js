const images = document.querySelectorAll('img');
const imageUrls = [];
images.forEach((img) => {
    const url = img.src;
    imageUrls.push(url);
});
chrome.runtime.sendMessage({images: imageUrls});


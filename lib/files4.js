/* exported FileManager */
const FileManager = (function() {

  // Gets the content of a text file using XHR.
  function getContent(url, binary) {

    if (typeof url == 'string') {
      return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        if (binary) {
          xhr.responseType = 'arraybuffer';
        } else {
          xhr.overrideMimeType('text/plain');
        }
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new Error('The file does not exist or you do not have permission to access it.'));
        try {
          xhr.send();
        } catch(e) {
          reject(e);
        }
      });
    }

    else if (Array.isArray(url))
      return Promise.all(url.map(u => getContent(u, binary)));

    else
      throw new TypeError('FileManager.getContent: argument 1 must be a string or array of strings representing a valid url.');

  }

  function saveBlob(oBlob, sFileName) {
    var URL = window.URL || window.webkitURL;
    var downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(oBlob);
    downloadLink.setAttribute('download', sFileName || '');
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  function readContent(file, type='text') {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(Error('Error while reading file from input.'));
      };
      if (type === 'text') {
        reader.readAsText(file, 'UTF-8');
      } else if (type === 'arraybuffer') {
        reader.readAsArrayBuffer(file);
      } else if (type === 'dataurl') {
        reader.readAsDataURL(file);
      }
    });
  }


  // Opens a file through the "Send file" dialog.
  function open({ multiple, readAs } = {}) {
    return new Promise((resolve) => {
      let input = document.createElement('input');
      input.type = 'file';
      input.hidden = true;
      input.multiple = !!multiple;
      input.onchange = () => {
        let files = Array.from(input.files);
        if (!multiple) {
          readContent(files[0], readAs).then(resolve);
          return;
        }
        let promiseMap = files.map((file) => readContent(file, readAs));
        Promise.all(promiseMap).then(resolve);
      };
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
  }

  function processResponseLines(responseText) {
    let lines = responseText.split(/\r?\n/);
    let files = [], base = './';
    lines.forEach(line => {
      let tokens = line.split(' ');
      if (tokens[0] === '300:') {
        base = tokens[1];
      }
      else if (tokens[0] === '201:'){
        files.push({
          name: tokens[1],
          path: base + tokens[1],
          length: Number(tokens[2]),
          lastModified: new Date(decodeURI(tokens[3])),
          type: tokens[4]
        });
      }
    });
    return files;
  }

  function getDirectoryListing(path, recurse) {

    async function readDir(path) {
      let itemsDescription = await getContent(path);
      let items = processResponseLines(itemsDescription);
      if (recurse) {
        for (let i = 0; i < items.length; i++) {
          let item = items[i];
          if (item.type === 'DIRECTORY') {
            let subItems = await readDir(item.path);
            items.splice(i, 1, ...subItems);
          }
        }
      }
      return items;
    }

    if (typeof path === 'string')
      return readDir(path);
    else if (Array.isArray(path))
      return Promise.all(path.map(readDir));
    else
      throw new Error('Argument 1 of getDirectoryListing is not a string or Array of valid URLs');

  }

  return {
    getContent,
    getDirectoryListing,
    open,
    saveBlob
  };

}());

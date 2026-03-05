const fs = require('fs');

async function testUpload() {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(100).fill(65)]), 'test.txt');
  form.append('fileKey', 'hash' + Date.now());
  form.append('fileName', 'test.txt');
  form.append('mimeType', 'text/plain');

  const res = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    body: form
  });
  
  console.log(res.status);
  console.log(await res.text());
}
testUpload();

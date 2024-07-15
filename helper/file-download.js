const fs = require('fs');
const axios = require('axios');
const path = require('path');


async function downloadFile(url, fileName) {
  try {
    // Send a GET request to the server to download the file
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });

    // Create a write stream to save the file to disk
    const filePath = path.join("public", "uploads", fileName);
    const file = fs.createWriteStream(filePath);

    // Pipe the data from the response to the file
    response.data.pipe(file);

    // Return the file path
    return filePath;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// const fileUrl = 'https://collect-v2-production.s3.ap-south-1.amazonaws.com/d89gkZx9BWJJ9mDppl53%2FYrSoSgxG5LgrQ8PTEKzB%2FZVAXQdGUXckKXXNFBjvX%2F45ff19e5-8437-463e-b256-8174aefc7c10.jpeg';
// const fileName = Date.now()+"."+fileUrl.split(".")[fileUrl.split(".").length-1];
// downloadFile(fileUrl, fileName)
//   .then((filePath) => {
//     console.log(`File downloaded to: ${filePath.split("accrue-node\\")[1]} and mime type image/${fileUrl.split(".")[fileUrl.split(".").length-1]}`);
//   })
//   .catch((error) => {
//     console.error(error);
// });

module.exports = {downloadFile}
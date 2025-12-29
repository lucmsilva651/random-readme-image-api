const express = require("express");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const app = express();
const port = 4000;
const imagesDir = path.join(__dirname, "images");

let lastImage = null;
let lastImageBuffer = null;
let requestCount = 0;
let resetTime = Date.now() + 5 * 60 * 1000;

app.use((req, res, next) => {
  const userAgent = req.get('User-Agent');

  if (userAgent.includes('github-camo')) {
    return next();
  } else {
    res.status(403)).json({ error: "Only requests made by Camo are allowed." });
  }
});

app.get("/", async (req, res) => {
  const now = Date.now();
  
  if (now > resetTime) {
    requestCount = 0;
    resetTime = now + 5 * 60 * 1000;
  }

  if (requestCount >= 5) {
    if (lastImageBuffer) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      return res.end(lastImageBuffer);
    } else {
      return res.status(429).json({ error: "Too many requests. Try again later." });
    }
  }

  fs.readdir(imagesDir, async (err, files) => {
    if (err || files.length === 0) {
      return res.status(404).json({ error: "No image found on /images. Did you forget to add your images there?" });
    }

    let randomImage;
    do {
      randomImage = files[Math.floor(Math.random() * files.length)];
    } while (files.length > 1 && randomImage === lastImage);

    lastImage = randomImage;
    const imagePath = path.join(imagesDir, randomImage);

    try {
      lastImageBuffer = await sharp(imagePath)
        .resize(220, 220, { fit: "cover" })
        .webp({
          force: true,
          effort: 6
        })
        .toBuffer();

      requestCount++;
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(lastImageBuffer);
    } catch (error) {
      res.status(500).json({ error: "Error processing image." });
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});

module.exports = app;

const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const app = express()
const mongoose = require('mongoose')
const GridFsStorage = require('multer-gridfs-storage')
const multer = require('multer')
const cors = require("cors")
const crypto = require('crypto')
const Grid = require("gridfs-stream")
require('dotenv').config()

app.use(bodyParser.json())

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Headers", "GET,PUT,POST,DELETE");
  next();
});

const port = 5000

app.listen(port, () => console.log(`Server started on port ${port}`))

//Connect to DB 

const NAME = process.env.NAME
const PASSWORD = process.env.PASSWORD

const mongoURI = `mongodb+srv://${NAME}:${PASSWORD}@cluster0.lsrdp.mongodb.net/uploadsGrid`

const conn = mongoose.createConnection(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

conn.once('open', () => {
  console.log('Connection Successful')
})

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err)
        }
        const filename = file.originalname
        const fileInfo = {
          filename: filename,
          bucketName: 'uploadsGrid',
        }
        resolve(fileInfo)
      })
    })
  },
})

const upload = multer({ storage })

app.post('/', upload.single('img'), (req, res, err) => {
  if (err) throw err
  res.status(201).send()
})

let gfs

conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo)
  gfs.collection('uploadsGrid')
  console.log('Connection Successful')
})

app.get('/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists',
      })
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename)
      console.log(file.filename, readstream)
      readstream.pipe(res)
    } else {
      res.status(404).json({
        err: 'Not an image',
      })
    }
  })
})
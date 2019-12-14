const express = require('express')
const Resource = require('../../src/resource')
const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  name: String
})

const PetsResource = new Resource({
  name: 'pets',
  id: 'uuid',
  model: mongoose.model('pets', schema, 'pets')
})

const app = express()
const port = 3000

app.get('/', (req, res) => res.send('Hello World!'))
PetsResource.mount('/pets', app)

mongoose.connect('mongodb://localhost:27017/pets', {})
  .then(() => {
    console.log('Connection to Mongodb Established')
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
  })
  .catch(error => {
    console.log('Unable to establish connection to Mongodb', error)
  })

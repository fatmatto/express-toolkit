'use strict'
const mongoose = require('mongoose')
const MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer

const setupMongoose = async () => {
  const mongod = await MongoMemoryServer.create()

  const mongoUri = mongod.getUri()

  const mongooseOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }

  return new Promise((resolve, reject) => {
    mongoose.connect(mongoUri, mongooseOpts)

    mongoose.connection.on('error', e => {
      if (e.message.code === 'ETIMEDOUT') {
        return mongoose.connect(mongoUri, mongooseOpts)
      }

      reject(e)
    })

    mongoose.connection.once('open', () => {
      resolve(mongoose.connection)
    })
  })
}

module.exports = setupMongoose

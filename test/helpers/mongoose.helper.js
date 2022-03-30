const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

/**
 * @returns {Promise}
 */
function setupMongoose () {
  const mongoServer = new MongoMemoryServer()

  mongoose.Promise = Promise
  return mongoServer.getConnectionString()
    .then((mongoUri) => {
      const mongooseOpts = {
        // options for mongoose 4.11.3 and above
        useNewUrlParser: true,
        useUnifiedTopology: true
      }

      return new Promise((resolve, reject) => {
        mongoose.connect(mongoUri, mongooseOpts)

        mongoose.connection.on('error', (e) => {
          if (e.message.code === 'ETIMEDOUT') {
            console.log(e)
            mongoose.connect(mongoUri, mongooseOpts)
          }
          console.log(e)
          return reject(e)
        })

        mongoose.connection.once('open', () => {
          // Successfully connected to MongoDB
          return resolve(mongoose.connection)
        })
      })
    })
}

module.exports = setupMongoose

// firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://chatappv2-22ba0-default-rtdb.asia-southeast1.firebasedatabase.app'
});
const db = admin.database()
module.exports = db


// backend/firebaseAdmin.js
const admin = require("firebase-admin");
const serviceAccount = require("./goupevents-infra-non-prod-s23-firebase-adminsdk-fbsvc-aa635c03a9.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
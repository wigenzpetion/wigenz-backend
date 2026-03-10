// push service chaffeur
const admin = require('firebase-admin');

exports.send = async (token, title, body) => {
  if (!token) return;

  await admin.messaging().send({
    token,
    notification: {
      title,
      body
    }
  });
};
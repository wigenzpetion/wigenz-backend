const crypto = require("crypto");

class SignatureService {

  static generateKeys() {
    return crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
  }

  static signData(data, privateKey) {
    const sign = crypto.createSign("SHA256");
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, "hex");
  }

  static verifySignature(data, signature, publicKey) {
    const verify = crypto.createVerify("SHA256");
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, "hex");
  }
}

module.exports = SignatureService;
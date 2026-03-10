const crypto = require("crypto");
const AuditRepository = require("./audit.repository");

class AuditService {

  static generateHash(data, previousHash) {

    const payload = JSON.stringify(data) + (previousHash || "");

    return crypto
      .createHash("sha256")
      .update(payload)
      .digest("hex");
  }

  static async record(data) {

    const previousHash = await AuditRepository.getLastHash();

    const hash = this.generateHash(data, previousHash);

    await AuditRepository.create({
      ...data,
      previousHash,
      hash
    });
  }

}

module.exports = AuditService;
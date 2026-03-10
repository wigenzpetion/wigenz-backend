const db = require("../../config/db");

/**
 * OTP SERVICE
 *
 * OTP livraison sécurisé :
 * - confirmer livraison
 * - fallback quand GPS imprécis
 */

class OTPService {

  /**
   * génération OTP livraison
   */

  static async generateDeliveryOTP(orderId) {

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    const otp =
      Math.floor(1000 + Math.random() * 9000).toString();

    await db.query(`
      INSERT INTO delivery_otps
      (order_id, otp_code, expires_at)

      VALUES ($1,$2,NOW() + INTERVAL '15 minutes')
    `,[orderId,otp]);

    return otp;

  }

  /**
   * validation OTP
   */

  static async verifyOTP(orderId, otp) {

    if (!orderId || !otp) {
      throw new Error("Order ID and OTP are required");
    }

    const result = await db.query(`
      SELECT *
      FROM delivery_otps
      WHERE order_id=$1
      AND otp_code=$2
      AND used=false
      AND expires_at > NOW()
    `,[orderId,otp]);

    if(!result.rows.length){
      throw new Error("Invalid OTP");
    }

    /**
     * marquer OTP utilisé
     */

    await db.query(`
      UPDATE delivery_otps
      SET used=true
      WHERE id=$1
    `,[result.rows[0].id]);

    return true;

  }

}

module.exports = OTPService;
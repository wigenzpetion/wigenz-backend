const DispatchRepository = require("./dispatch.repository");

class DispatchController {

  static async updateLocation(req,res){

    const { lat,lng } = req.body;

    await DispatchRepository.updateDriverLocation(
      req.user.id,
      lat,
      lng
    );

    res.json({
      message:"location updated"
    });

  }

}

module.exports = DispatchController;
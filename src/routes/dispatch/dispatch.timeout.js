const eventBus = require("../../core/eventBus");

/**
 * timeout chauffeur
 */

function startTimeout(orderId,driverId){

  setTimeout(()=>{

    eventBus.emit("DISPATCH_TIMEOUT",{
      orderId,
      driverId
    });

  },15000);

}

module.exports = { startTimeout };
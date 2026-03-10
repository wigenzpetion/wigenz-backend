const eventBus = require("../../core/eventBus");
const DispatchService = require("./dispatch.service");

eventBus.on("ORDER_CREATED", async(order)=>{

  try{

    const drivers =
      await DispatchService.dispatch(order);

    eventBus.emit("DISPATCH_DRIVERS_FOUND",{
      orderId:order.id,
      drivers
    });

  }catch(error){

    eventBus.emit("DISPATCH_FAILED",{
      orderId:order.id
    });

  }

});
import { ISubscriber, Machine, Events, EventType } from './types';

// Sale Event
export class MachineSaleSubscriber implements ISubscriber {
    readonly topics : EventType[] = ['MachineSold'];
    handle(event: Events, ctx: { machines: Machine[]; publish: (e: Events) => void }):void {
        if (event.type !== 'MachineSold') return;

        const machine = ctx.machines.find(iterate => iterate.id === event.machineId);

        if (!machine) return;

        // Checking current machine stock
        if(machine.stock)

        machine.stock = Math.max(0, machine.stock - event.qty);

        if (machine.stock < 3 && !machine.notiLowStock) {
            machine.notiLowStock = true;
            ctx.publish({
                type: 'StockLevelLow',
                machineId: machine.id
            });
        }
    };
}

// Refill event
export class MachineRefillSubscriber implements ISubscriber{
    readonly topics : EventType[] = ["MachineRefill"];
    handle(event: Events, ctx : {machines: Machine[]; publish: (e:Events)=> void}):void{
        if(event.type !== "MachineRefill") return;

        const machine = ctx.machines.find(iterate => iterate.id === event.machineId);

        if(!machine) return;
        machine.stock += event.qty; // Refilled +qty

        if(machine.stock >= 3 && machine.notiLowStock){
            machine.notiLowStock = false;
            ctx.publish({
                type: 'StockLevelSufficient',
                machineId : machine.id
            });
        }
    }
}

export class StockWarningLogger implements ISubscriber{
    readonly topics: EventType[] = ['StockLevelLow', 'StockLevelSufficient'];
    handle(event: Events){
        if(event.type === 'StockLevelLow'){
            console.log(`[WARNING] Machine${event.machineId} : Low stock`);
        }else if(event.type === "StockLevelSufficient"){
            console.log(`[OK] Machine${event.machineId} : Sufficiently stock`);
        }
    }
}
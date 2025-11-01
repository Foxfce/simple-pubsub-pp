import { InMemmoryPubSub } from './noob-pubsub';
import { Machine } from './types';
import { MachineRefillSubscriber, MachineSaleSubscriber, StockWarningLogger } from './subscriber';

const machines: Machine[] = [
    {id: '001', stock: 5, notiLowStock: false},
    {id: '002', stock: 5, notiLowStock: false},
    {id: '003', stock: 2, notiLowStock: true},
];

const  bus = new InMemmoryPubSub(machines);

const eventSale = new MachineSaleSubscriber();
const eventRefill = new MachineRefillSubscriber();
const eventWarn = new StockWarningLogger();

// -------------------------- Random function for test --------------------------------
const randomMachine = (): string => {
    const random = Math.random() * 3;
    if (random < 1) {
        return '001';
    } else if (random < 2) {
        return '002';
    }
    return '003';
    
}

const eventGenerator = (): IEvent => {
    const random = Math.random();
    if (random < 0.5) {
        const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
        return new MachineSaleEvent(saleQty, randomMachine());
    } 
    const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
    return new MachineRefillEvent(refillQty, randomMachine());
}
// ---------------------------------------------------------------------------------------

eventSale.topics.forEach(t => bus.subscribe(t, eventSale));
eventRefill.topics.forEach(t => bus.subscribe(t, eventRefill));
eventWarn.topics.forEach(t => bus.subscribe(t, eventWarn));

// Test run
bus.publish({type: 'MachineSold', machineId : '001', qty: 3});
bus.publish({type: 'MachineRefill', machineId : '001', qty: 5});

console.log(machines);
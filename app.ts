type EventsType = "SoldEvent" | "RefillEvent" | "StockLowEvent" | "StockFineEvent" | "WarningEvent";

// interfaces
interface IEvent {
  type(): EventsType;
  machineId(): string;
}

interface ISubscriber {
  handle(event: IEvent): void;
}

interface IPublishSubscribeService {
  publish(event: IEvent): void;
  subscribe(type: EventsType, handler: ISubscriber): void;

  // unsubscribe ( /* Question 2 - build this feature */ );
  unsubscribe(type: EventsType, handler: ISubscriber): void;
}


// implementations
class InMemmoryPubSub implements IPublishSubscribeService {
  private subscribed = new Map<EventsType, Set<ISubscriber>>(); // need option that not need Map
  private queus: IEvent[] = [];
  private onProcess = false;

  publish(event: IEvent): void {
    // Add new event to last of array
    this.queus.push(event);

    // If to prevent publish action while process is on going
    if (this.onProcess) return;

    // Set ongoing state to true
    this.onProcess = true;
    try {
      // check if their is action waiting in queus
      while (this.queus.length > 0) {
        // Get first event in queus, ()! to tell ts that it will not be undefine
        const currentEvent = this.queus.shift()!;

        // Get all subscriber on type event
        const subscriberSet = this.subscribed.get(currentEvent.type());
        if (!subscriberSet || subscriberSet.size === 0) continue; // no subscriber then jump to next event

        for (const sub of Array.from(subscriberSet)) {
          sub.handle(event);
          // sub.handle(current, {
          //   machines: this.machineRef!,
          //   publish: (e) => this.queus.push(e),
          // });
        }
      }
    }
    finally {
      // Return ongoing state to false
      this.onProcess = false;
    }
  }

  subscribe(topic: EventsType, subscribers: ISubscriber): void {
    // create new if not existed, prevent error
    if (!this.subscribed.has(topic)) {
      this.subscribed.set(topic, new Set());
    }

    this.subscribed.get(topic)!.add(subscribers);
  }

  unsubscribe(topic: EventsType, subscribers: ISubscriber): void {
    this.subscribed.get(topic)?.delete(subscribers)
  }
}

class MachineSaleEvent implements IEvent {
  constructor(private readonly _sold: number, private readonly _machineId: string) { }

  machineId(): string {
    return this._machineId;
  }

  getSoldQuantity(): number {
    return this._sold
  }

  type(): EventsType {
    return 'SoldEvent';
  }
}

class MachineRefillEvent implements IEvent {
  constructor(private readonly _refill: number, private readonly _machineId: string) { }

  machineId(): string {
    return this.machineId();
    // throw new Error("Method not implemented.");
  }

  type(): EventsType {
    return 'RefillEvent';
    // throw new Error("Method not implemented.");
  }

  getRefillQuantity() : number{
    return this._refill;
  }
}

class MachineSaleSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: IEvent): void {
    // if Event is not sale event stop handle function
    if (!(event instanceof MachineSaleEvent)) return;

    const machine = this.machines.find(x => x.id === event.machineId());
    // can't find machine return
    if (!machine) return;

    const soldQty = event.getSoldQuantity();
    machine.stockLevel = machine.stockLevel - soldQty;

    console.log(`[SALE] ${machine.id} sold ${soldQty} cup${soldQty > 1 ? 's' : ''} , current stock is : ${machine.stockLevel}`);
    // this.machines[2] still fixed with 2 need change later
    // this.machines[2].stockLevel -= event.getSoldQuantity();
  }
}

class MachineRefillSubscriber implements ISubscriber {
  constructor(private machines: Machine[]) { }

  handle(event: IEvent): void {
    if (!(event instanceof MachineRefillEvent)) return;

    const machine = this.machines.find( i => i.id === event.machineId());
    if(!machine) return;

    const refillQty = machine.stockLevel + event.getRefillQuantity();

    console.log(`[REFILL] ${machine.id} refilled ${refillQty} cup${refillQty > 1 ? 's' : ''} , current stock is : ${machine.stockLevel}`);
    // throw new Error("Method not implemented.");
  }
}


// objects
class Machine {
  public stockLevel = 10;
  public id: string;

  // for low stock noti check
  public notiLowStock : boolean = false;

  constructor(id: string) {
    this.id = id;
  }
}


// helpers
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

// program
(async () => {
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [new Machine('001'), new Machine('002'), new Machine('003')];

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machines);
  const refillSubscriber = new MachineRefillSubscriber(machines);

  // create the PubSub service
  const pubSubService: IPublishSubscribeService = new InMemmoryPubSub() // implement and fix this

  // create 5 random events
  const events = [1, 2, 3, 4, 5].map(i => eventGenerator());

  // publish the events
  events.map((machineEvent) => pubSubService.publish(machineEvent));
})();

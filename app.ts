type EventsType = "SoldEvent" | "RefillEvent" | "StockLowEvent" | "StockOkEvent";

// interfaces
interface IEvent {
  type(): EventsType;
  machineId(): string;
}

interface ISubscriber {
  handle(
    event: IEvent,
    context: {
      echoTo: (event: IEvent) => void
    }
  ): void;
}

interface IPublishSubscribeService {
  publish(event: IEvent): void;
  subscribe(type: EventsType, handler: ISubscriber): void;

  // unsubscribe ( /* Question 2 - build this feature */ );
  unsubscribe(type: EventsType, handler: ISubscriber): void;
}


// implementations
class PubSubService implements IPublishSubscribeService {
  private subscribed = new Map<EventsType, Set<ISubscriber>>();
  private queus: IEvent[] = [];
  private onProcess = false;

  constructor(private machines: Machine[]) { }

  publish(event: IEvent): void {
    // Add new event to last of array
    this.queus.push(event);

    // If to prevent publish action while process is on going
    if (this.onProcess) return;
    this.onProcess = true;

    try {
      // check if there is action waiting in queus
      while (this.queus.length > 0) {
        // Get first event in queus, ()! to tell ts that it will not be undefine
        const currentEvent = this.queus.shift()!;

        // Get all subscriber on type event
        const subscriberSet = this.subscribed.get(currentEvent.type());
        if (!subscriberSet || subscriberSet.size === 0) continue; // no subscriber then jump to next event

        for (const sub of Array.from(subscriberSet)) {
          sub.handle(
            currentEvent, {
            // machines: this.machines,
            echoTo: (e: IEvent) => this.publish(e)
          }
          );
        }
      }
    }
    finally {
      // Return ongoing state to false
      this.onProcess = false;
    }
  }

  subscribe(eventType: EventsType, subscribers: ISubscriber): void {
    // create new if not existed, prevent error
    if (!this.subscribed.has(eventType)) {
      this.subscribed.set(eventType, new Set());
    }

    this.subscribed.get(eventType)!.add(subscribers);
  }

  unsubscribe(eventType: EventsType, subscribers: ISubscriber): void {
    this.subscribed.get(eventType)?.delete(subscribers)
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
    return this._machineId;
    // throw new Error("Method not implemented.");
  }

  type(): EventsType {
    return 'RefillEvent';
    // throw new Error("Method not implemented.");
  }

  getRefillQuantity(): number {
    return this._refill;
  }
}

class LowStockWarningEvent implements IEvent {
  constructor(private readonly _machineId: string, private readonly _stockLevel: number) { }

  type(): EventsType {
    return "StockLowEvent";
  }

  machineId(): string {
    return this._machineId;
  }

  stockLevel(): number {
    return this._stockLevel;
  }
}

class StockLevelOkEvent implements IEvent {
  constructor(private readonly _machineId: string, private readonly _stockLevel: number) { }

  type(): EventsType {
    return "StockOkEvent";
  }

  machineId(): string {
    return this._machineId;
  }

  stockLevel(): number {
    return this._stockLevel;
  }
}

class MachineSaleSubscriber implements ISubscriber {
  // public machines: Machine[];

  // constructor(machines: Machine[]) {
  //   this.machines = machines;
  // }

  constructor(private machineRepo: IMachineRepo) { }

  handle(event: MachineSaleEvent, context: { echoTo: (event: IEvent) => void }): void {
    const machine = this.machineRepo.findById(event.machineId());
    // can't find machine return
    if (!machine) return;

    const soldQty = event.getSoldQuantity();

    if (machine.stockLevel < soldQty) {
      console.log(`[ERROR] Machine${machine.id} Insufficient stock, current stock is : ${machine.stockLevel}`)
      return;
    }
    machine.stockLevel -= soldQty;
    this.machineRepo.update(machine);

    console.log(`[SALE] Machine${machine.id} sold ${soldQty} cup${soldQty > 1 ? 's' : ''} , current stock is : ${machine.stockLevel}`);
    if (machine.stockLevel < 3 && !machine.notiLowStock) {
      machine.changeLowStockState(true);
      this.machineRepo.update(machine);
      context.echoTo(new LowStockWarningEvent(machine.id, machine.stockLevel));
    }

    // this.machines[2].stockLevel -= event.getSoldQuantity();
  }
}

class MachineRefillSubscriber implements ISubscriber {
  // constructor(private machines: Machine[]) { };
  constructor(private machineRepo: IMachineRepo) { }

  handle(event: MachineRefillEvent, context: { echoTo: (event: IEvent) => void }): void {

    const machine = this.machineRepo.findById(event.machineId());
    if (!machine) {
      console.log(`[ERROR] Machine${event.machineId()} does not existed`);
      return;
    };

    const refillQty = event.getRefillQuantity();
    machine.stockLevel += refillQty;
    this.machineRepo.update(machine);


    console.log(`[REFILL] Machine${machine.id} refilled ${refillQty} cup${refillQty > 1 ? 's' : ''} , current stock is : ${machine.stockLevel}`);

    if (machine.stockLevel >= 3 && machine.notiLowStock) {

      machine.changeLowStockState(false);
      this.machineRepo.update(machine);

      context.echoTo(new StockLevelOkEvent(machine.id, machine.stockLevel));
    }

    // throw new Error("Method not implemented.");
  }
}

class StockWarningSubscriber implements ISubscriber {
  // constructor(private currentMachine: Machine[]) { };
  constructor(private machineRepo: IMachineRepo) { }

  handle(event: IEvent): void {
    const machine = this.machineRepo.findById(event.machineId());

    if (event.type() === "StockLowEvent") {
      console.log(`[WARNING] Machine${machine!.id} stock is LOW, current stock is : ${machine!.stockLevel}`);
    } else if (event.type() === "StockOkEvent") {
      console.log(`[OK] Machine${machine!.id} stock is now OK, current stock is : ${machine!.stockLevel}`);
    }
  }
}


// objects
class Machine {
  public stockLevel = 5;
  public id: string;

  // for low stock noti check (no repeat)
  public notiLowStock: boolean = false;

  constructor(id: string) {
    this.id = id;
  }

  changeLowStockState(state: boolean): void {
    this.notiLowStock = state;
  }
}

// Try in repository
interface IMachineRepo {
  getAll(): Machine[];
  findById(id: string): Machine | undefined;
  update(machine: Machine): void;
  add(machines: Machine[]): void;
  remove(machineId: string | undefined): void;
}

class MachineRepo implements IMachineRepo {
  private machines = new Map<string, Machine>();

  constructor(initialMachines: Machine[]) {
    initialMachines.forEach(mech => this.machines.set(mech.id, mech));
  }

  getAll(): Machine[] {
    return Array.from(this.machines.values())
  }

  findById(id: string): Machine | undefined {
    return this.machines.get(id);
  }

  update(machine: Machine): void {
    this.machines.set(machine.id, machine)
  }

  add(newMachines: Machine[]): void {
    newMachines.forEach(mech => {
      if (this.machines.has(mech.id)) {
        console.log(`[ERROR] Machine${mech.id} Already exsited`);
        return;
      }
      console.log(`[ADD] Machine${mech.id} to Machine Repository`)
      this.machines.set(mech.id, mech)
    });
  }

  remove(machineId: string): void {
    if (this.machines.has(machineId)) {
      this.machines.delete(machineId);
      console.log(`[REMOVE] Machine${machineId} from Repo`);
      return;
    }
    console.log(`Machine${machineId} Already Removed`);
  }
}


// helpers
const randomMachine = (maxNum: number): string => {
  if (maxNum >= 1000 || maxNum < 1) {
    throw new Error('Provided number is invalid : should be between 1 and 999');
  }
  const random = Math.ceil(Math.random() * Math.floor(maxNum));

  const randomToStr: string = random.toString();

  if (randomToStr.length > 2) {
    return randomToStr;
  } else if (randomToStr.length > 1) {
    return `0${randomToStr}`;
  }
  return `00${randomToStr}`;
}

const eventGenerator = (conCurrentMachine: number): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine(conCurrentMachine));
  }
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine(conCurrentMachine));
}

// program
(async () => {
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [new Machine('001'), new Machine('002'), new Machine('003')];
  const machineRepo: MachineRepo = new MachineRepo(machines);

  const machine003 = machineRepo.getAll()[2];

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machineRepo);
  const refillSubscriber = new MachineRefillSubscriber(machineRepo);
  const stockWarningSubscriber = new StockWarningSubscriber(machineRepo);

  // const saleUnSubscriber = new MachineSaleSubscriber(machines);

  // create the PubSub service
  const pubSubService = new PubSubService(machines) // implement and fix this

  pubSubService.subscribe("RefillEvent", refillSubscriber);
  pubSubService.subscribe("SoldEvent", saleSubscriber);
  pubSubService.subscribe("StockLowEvent", stockWarningSubscriber);
  pubSubService.subscribe("StockOkEvent", stockWarningSubscriber);

  // create 40 random events
  const events = new Array(40).fill(null).map(i => eventGenerator(3));

  let randomRemove;

  // publish the events
  events.map((machineEvent) => {

    randomRemove = Math.ceil(Math.random() * 100);
    if (randomRemove < 20) {
      //   pubSubService.unsubscribe("SoldEvent", saleSubscriber);
      machineRepo.remove(machine003.id);
      //   console.log("Machine try to unsubscribe SoldEvent");   
    }

    pubSubService.publish(machineEvent);

  });
  console.log('--------- finish action 1 -------------');

  const newMachines: Machine[] = [new Machine('004'), new Machine('005')];

  machineRepo.add(newMachines);

  const events2 = new Array(40).fill(null).map(i => eventGenerator(5));

  events2.map((machineEvent) => {

    // random add machine003 back
    randomRemove = Math.ceil(Math.random() * 100);
    if (randomRemove < 10) {
      machineRepo.add([machine003]);
    }

    pubSubService.publish(machineEvent);

  });

})();

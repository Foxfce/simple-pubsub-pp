interface IEvent {
  type(): string;
  machineId(): string;
}

interface ISubscriber {
  handle(event: IEvent): void;
}

interface IPublishSubscribeService {
  publish (event: IEvent): void;
  subscribe (type: string, handler: ISubscriber): void;
}

// Event Handler "Sale"
class MachineSaleEvent implements IEvent {
  constructor(private readonly _sold: number, private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  getSoldQuantity(): number {
    return this._sold
  }

  type(): string {
    return 'sale';
  }
}

// Contain subscriber and their attached event 
class PublishSubscribeService implements IPublishSubscribeService{
  // to contain key: string  value: handler for each subsciberMachine
  public subscriber: Record<string, ISubscriber[]> = {};

  publish(event: IEvent): void {
      const type = event.type();
      const handlers = this.subscriber[type] || []; // if not have type -> creating new empty array prevent error

      // Broadcast to each subscriber that subscribed to an event
      for(const handler of handlers){
        handler.handle(event);
      }
  }
  subscribe(type: string, handler: ISubscriber): void {
      // if don't really have event type yet, create new array to add handler
      if(!this.subscriber[type]){
        this.subscriber[type] = [];
      }
      // Add handler to type
      this.subscriber[type].push(handler);
  }
  unsubscribe(type: string, handler: ISubscriber): void {
      
  }
}

// Handler Event Machine that want to know "sale"
class MachineSaleSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor (machines: Machine[]) {
    this.machines = machines; 
  }

  // handle(event: MachineSaleEvent): void {
  //   // this.machines[2] still fixed with 2 need change later
  //   this.machines[2].stockLevel -= event.getSoldQuantity();
  // }

  handle(event: IEvent): void {
      const saleEvent = event as MachineSaleEvent;
      console.log(`The ${saleEvent.machineId()} has been sale ${saleEvent.getSoldQuantity()} ea`);
  }
}

// objects
class Machine {
  public stockLevel = 10;
  public id: string;

  constructor (id: string) {
    this.id = id;
  }
}

// mock machines data
const machines: Machine[] = [ new Machine('001'), new Machine('002')];

// create class publish 
const pubsub = new PublishSubscribeService();

// add machine that want to subscribe to event "sale"
const saleSubscriber = new MachineSaleSubscriber(machines);

// console.log(saleSubscriber);

// saleSubscriber.machines.push(new Machine('005'));

// console.log(saleSubscriber.machines);

pubsub.subscribe("sale", saleSubscriber);


console.log((pubsub.subscriber.sale)[0]);

pubsub.publish(new MachineSaleEvent(3, "Machine01"));



// const doSomething = (callback: ()=> void) =>{
//   console.log("Working");
//   callback();  
// }

// doSomething(()=> console.log("done callback"));

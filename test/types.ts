export type MachineId = string;

export interface Machine {
    id: MachineId;
    stock: number;
    notiLowStock: boolean;
}

export type Events =
    { type: "MachineSold"; machineId: MachineId; qty: number }
    | { type: "MachineRefill"; machineId: MachineId; qty: number }
    | { type: "MachineWarning"; machineId: MachineId }
    | { type: "StockLevelSufficient"; machineId: MachineId }
    | { type: "StockLevelLow"; machineId: MachineId };

export type EventType = Events['type'];

export interface ISubscriber {
    readonly topics: EventType[];

    handle(
        event: Events,
        ctx: {
            machines: Machine[];
            publish: (event: Events) => void
        }
    ): void;
}

export interface IPublishSubscribeService {
    publish(event: Events): void;

    subscribe(topic: EventType, subscribers: ISubscriber): void;
    unsubscribe(topic: EventType, subscribers: ISubscriber): void;
}

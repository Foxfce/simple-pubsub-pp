import { Events, EventType, IPublishSubscribeService, ISubscriber, Machine } from "./types";

export class InMemmoryPubSub implements IPublishSubscribeService {
    private subscribed = new Map<EventType, Set<ISubscriber>>(); // need option that not need Map
    private queus: Events[] = [];
    private onProcess = false;

    constructor(private machineRef: Machine[]){};
    
    publish(event: Events): void {
        // Add new event to last of array
        this.queus.push(event);

        // If to prevent publish action while processs is on going
        if(this.onProcess) return;

        // Set ongoing state to true
        this.onProcess = true;
        try {
            while(this.queus.length){
                const current = this.queus.shift()!;

                // Get all subscriber on type event
                const set = this.subscribed.get(current.type);
                if(!set || set.size === 0) continue; // no subscriber then jump to next event

                for(const sub of Array.from(set)){
                    sub.handle(current, {
                        machines: this.machineRef!,
                        publish: (e) => this.queus.push(e),
                    });
                }
            }
        } catch (error) {
            throw new Error("Error while publishing")
        }finally{
            // Return ongoing state to false
            this.onProcess = false;
        }
    }

    subscribe(topic: EventType, subscribers: ISubscriber): void {
        // create new if not existed, prevent error
        if(!this.subscribed.has(topic)){
            this.subscribed.set(topic, new Set());
        }

        this.subscribed.get(topic)!.add(subscribers);
    }

    unsubscribe(topic: EventType, subscribers: ISubscriber): void {
        this.subscribed.get(topic)?.delete(subscribers)
    }
}
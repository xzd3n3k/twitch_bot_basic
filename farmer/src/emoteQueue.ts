import {Channel} from "./types";

class EmoteQueue {
    queue: Map<string, Array<string | null>>;
    size: number;
    channels: string[];


    constructor(size: number, channels: string[]) {
        this.queue = new Map();
        this.size = size;
        this.channels = channels;
        this.init();
    }

    push(channelName: string, value: string | null) {
        const arr = this.queue.get(channelName);
        if (!arr) {
            if (!arr) {
                throw new Error(`Couldn't find channel ${channelName}`);
            }
        }

        arr.push(value);
        this.pop(channelName);
    }

    pop(channelName: string): string | null | undefined {
        const arr = this.queue.get(channelName);
        if (!arr) {
            throw new Error(`Couldn't find channel ${channelName}`);
        }

        return arr.shift();
    }

    init() {
        for (const channel of this.channels) {
            this.queue.set(channel, Array(this.size).fill(null));
        }
    }

    getOccurrence(channelName: string): Map<string, number> {
        const map = new Map;
        const arr = this.queue.get(channelName)

        if (!arr) {
            throw new Error(`Couldn't find channel ${channelName}`);
        }

        for (const val of arr) {
            if (!val) {
                continue;
            }
            if (map.get(val)) {
                map.set(val, map.get(val) + 1);
            } else {
                map.set(val, 1);
            }
        }

        return map;
    }
}

export default EmoteQueue;
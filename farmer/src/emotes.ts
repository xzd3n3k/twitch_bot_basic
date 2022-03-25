import axios from "axios";
import {Channel} from "./types";

class Emotes {

    channels: Channel[]
    globalEmotes: Set<string>;
    channelEmotes: Map<string, Set<string>>;

    constructor(channels: Channel[]) {
        this.globalEmotes = new Set();
        this.channelEmotes = new Map();
        this.channels = channels;
    }

    async init() {
        this.globalEmotes = await this.fetchGlobalEmotes();

        for (const channel of this.channels) {
            const data = await this.fetchChannelEmotes(channel.id);
            this.channelEmotes.set(channel.name, data);
        }

    }

    async fetchGlobalEmotes(): Promise<Set<string>> {
        const res = await axios.get("https://api.betterttv.net/3/cached/emotes/global");

        interface Emote {
            id: string;
            code: string;
            imageType: string;
            userId: string;
        }

        return new Set(res.data.map((emote: Emote) => emote.code.replace(/:/g, "")));
    }

    async fetchChannelEmotes(channelId: string): Promise<Set<string>> {
        const emotes: Set<string> = new Set();

        const BTTV_URL = "https://api.betterttv.net/3/cached/users/twitch/";
        const FFZ_URL = "https://api.betterttv.net/3/cached/frankerfacez/users/twitch/";

        const bttv_res = await axios.get(BTTV_URL + channelId);
        const ffz_res = await axios.get(FFZ_URL + channelId);

        for (let emote of bttv_res.data["channelEmotes"]) {
            const e = emote.code;
            if (!this.globalEmotes.has(e)) {
                emotes.add(e);
            }
        }

        for (let emote of ffz_res.data) {
            const e = emote.code;
            if (!this.globalEmotes.has(e)) {
                emotes.add(e);
            }
        }

        return emotes;
    }

    checkEmote(channel: string, emote: string): boolean {
        const channel_emotes = this.channelEmotes.get(channel) || new Set<string>();
        return this.globalEmotes.has(emote) || channel_emotes.has(emote);
    }
}

export default Emotes;
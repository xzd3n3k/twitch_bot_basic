import {Account, Channel} from "./types";
import axios from "axios";
import EmoteQueue from "./emoteQueue";
import {generateNNumbers, getRandomInt, getRandomNumber, timer} from "./utils";
import {appendFile} from "fs";
import {ChatEvents, Events} from "twitch-js";
import Emotes from "./emotes";
import {Client} from "tmi.js";
import {pino} from "pino";
import {createWriteStream} from "fs";
import {randomInt} from "crypto";

const QUEUE_SIZE = 15;
const logger = pino({
    prettyPrint: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "hostname,pid"
    },
    name: "gamdom_farmer",
    level: "info"
}, pino.multistream([{stream: process.stdout}, {stream: createWriteStream("app.log", {flags: "a"})}]));

class Farmer {
    managerAccount: Client | undefined;
    bots: Client[];
    botStates: boolean[];
    channels: Channel[];
    clientID: string;
    token: string;
    interval: NodeJS.Timer | undefined;
    emoteQueue: EmoteQueue;
    emotes: Emotes | undefined;
    _channel_names: string[];
    _accounts: Account[];
    greetings: Map<string, string[][]>;

    constructor(accounts: Account[], channel_names: string[], api: { token: string, clientID: string }) {
        this.clientID = api.clientID;
        this.token = api.token;
        this.bots = [];
        this.channels = [];
        this.botStates = [];
        this._channel_names = channel_names;
        this._accounts = accounts;
        this.emoteQueue = new EmoteQueue(QUEUE_SIZE, this._channel_names);
        this.greetings = new Map([
            ["roshtein", [["yoo rosh", "hi", "hi rosh", "sup", "hello", "good evening", "hi everyone"], ["roshCARROT", "PauseChamp", "PauseShake", "ROSHI", "roshDab", "AlienPls", "vibePls", "roshAbdul", "YEPJAM", "WIGGLE"]]],
            ["ayezee", [["yoo zee", "hi", "hi zee", "sup", "hello zee", "good evening", "hi everyone"], ["HeyZee", "Jammies", "scootsGIGAZEE", "ayezeeBYE", "scootsGREG", "Scoots", "pugPls", "ayezeePls", "TinfoilZeeRight", "ayezeeSCOOTS"]]]
        ])
    }

    async init() {
        this.channels = await this.initChannels(this._channel_names);
        [this.managerAccount, this.bots] = this.initBots(this._accounts);
        this.emotes = new Emotes(this.channels);
        await this.emotes.init();
        this.botStates = new Array(this.bots.length).fill(true);
    }

    initBots(accounts: Account[]): [Client, Client[]] {
        const manager = new Client({});

        manager.on("connected", () => {
            logger.info(`Watcher connected`);
        })

        manager.on("message", (channelName, userstate, message, self) => {
            let inserted = false;
            channelName = channelName.replace("#", "");
            const channel = this.getChannel(channelName);

            for (const word of message.split(" ")) {
                if (!channel || !channel.isLive) {
                    continue;
                }

                const author = userstate.username as string;
                if (this.emotes?.checkEmote(channelName, word) && !this.isBot(author)) {
                    this.emoteQueue.push(channelName, word);
                    inserted = true;
                    break;
                }
            }

            if (!inserted) {
                this.emoteQueue.push(channelName, null);
            }

            for (const [emote, count] of this.emoteQueue.getOccurrence(channelName)) {
                if (emote && count >= (QUEUE_SIZE * 0.4)) {
                    const idxs = generateNNumbers(getRandomInt(1, this.bots.length), 0, this.bots.length);
                    for (const idx of idxs) {
                        if (!this.botStates[idx]) {
                            continue;
                        }
                        const bot = this.bots[idx];
                        this.botStates[idx] = false;
                        const minutesToSleep = randomInt(5, 60);
                        setTimeout(() => {
                            this.botStates[idx] = true;
                        }, minutesToSleep * 60 * 1000)
                        const sleepTime = getRandomNumber(500, 3000);
                        setTimeout(async () => {
                            await bot.say(channelName, emote);
                            logger.info(`[${new Date().toLocaleString()}] [${channelName}] ${bot.getUsername()}: ${emote}`);
                        }, sleepTime);
                    }
                    this.emoteQueue.init();
                }
            }

        })

        const bots = [];

        for (const account of accounts) {
            const bot = new Client({identity: {username: account.username, password: account.token}})

            bot.on("connected", () => {
                logger.info(`Connected as ${bot.getUsername()}`);
            })

            bots.push(bot);
        }

        return [manager, bots];
    }

    async initChannels(channelNames: string[]) {
        return await Promise.all(channelNames.map(async (channelName) => {
            const channel = await this.fetchChannelsInfo(channelName);
            const channelID = channel.id;
            const isLive = channel.is_live;
            return {name: channelName, isLive, id: channelID};
        }));
    }

    async fetchChannelsInfo(channelName: string): Promise<any> {
        return axios.get(`
                https://api.twitch.tv/helix/search/channels?query=${channelName}`, {
            headers: {
                "Authorization":
                    `Bearer ${this.token}`,
                "Client-Id":
                this.clientID
            }
        }).then(res => {
            // @ts-ignore
            return res.data.data.filter(_channel => _channel.broadcaster_login.toLowerCase() === channelName.toLowerCase())[0];
        }).catch(e => {
            logger.error("Error while etching channel info", e);
        });
    }


    monitorChannels() {
        return setInterval(() => {
            for (const channel of this.channels) {
                this.fetchChannelsInfo(channel.name).then(({is_live}) => {
                    if (is_live !== channel.isLive) {
                        if (is_live) {
                            logger.info(`Joining ${channel.name}`)
                            this.bots.forEach(async (bot) => {
                                await bot.join(channel.name);
                                const minutesToSleep = getRandomNumber(5, 40);
                                // TODO: Mozna dodelat !first ?
                                setTimeout(async () => {
                                    const greeting = this.generateGreeting(channel.name);
                                    await bot.say(channel.name, greeting);
                                    logger.info(`[${new Date().toLocaleString()}] [${channel.name}] ${bot.getUsername()}: ${greeting}`);
                                }, minutesToSleep * 60 * 1000)
                            })
                        } else {
                            logger.info(`Leaving ${channel.name}`)
                            this.bots.forEach((bot) => bot.part(channel.name))
                        }
                    }
                    channel.isLive = is_live;
                });
            }

        }, 10000);
    }

    isBot(username: string): boolean {
        return this.bots.map(bot => bot.getUsername().toLowerCase()).includes(username.toLowerCase());
    }

    getChannel(channelName: string): Channel | undefined {
        return this.channels.find(channel => channel.name === channelName);
    }

    generateGreeting(channelName: string): string {
        const repetition = getRandomInt(0, 2);
        const data = this.greetings.get(channelName);
        if (!data) {
            throw new Error(`No greetings for channel ${channelName}`);
        }

        const [greetings, emotes] = data;
        const greetingIdx = getRandomInt(0, greetings.length - 1);
        const emoteIdx = getRandomInt(0, emotes.length - 1);

        return `${greetings[greetingIdx]} ${(emotes[emoteIdx] + " ").repeat(repetition)}`

    }

    async run() {
        this.interval = this.monitorChannels();

        if (!this.managerAccount) {
            return;
        }

        const manager = this.managerAccount;
        await manager.connect();
        for (const channel of this.channels) {
            await manager.join(channel.name);
        }

        for (const bot of [...this.bots]) {
            await bot.connect();
            for (const channel of this.channels) {
                if (channel.isLive) {
                    await bot.join(channel.name);
                }
            }
        }

    }
}


export default Farmer;

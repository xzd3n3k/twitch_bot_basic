export interface Account {
    username: string;
    token: string
}

export interface Config {
    api: { token: string, clientID: string };
    channels: Array<string>;
    accounts: Array<Account>;
}

export interface Channel {
    name: string;
    isLive: boolean;
    id: string
}

import {Client} from "tmi.js";
import exp from "constants";
import {Chat} from "twitch-js";

export const getRandomNumber = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
}

export const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export const generateNNumbers = (n: number, min: number, max: number): number[] => {
    const arr = []
    for (let i = 0; i < n; i++) {
        arr.push(getRandomInt(min, max));
    }

    return arr;
}

export const timer = (ms: number) => new Promise(res => setTimeout(res, ms));
import {Config} from "./types";
import appConfigJson from "../config.json";
import Farmer from "./farmer";


const appConfig = appConfigJson as Config

const run = async () => {
    const farmer = new Farmer(appConfig.accounts, appConfig.channels, appConfig.api);

    try {
        await farmer.init();
        await farmer.run();
        // console.log(farmer.greetings)
        // for (let i = 0; i < 15; i++) {
        //     console.log(farmer.generateGreeting("ayezee"));
        // }
    } catch (e) {
        console.log(e);
    }
}

run();

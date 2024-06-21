const Robot = require("./utils/Robot.js");
const fs = require("fs");
const axios = require("axios");
const path = require("path");
const Manager = require("./utils/Manager.js");

require("dotenv").config();


const config = {
	robotsUnit: parseInt(process.env.ROBOTS_UNIT),
	startPrice: parseInt(process.env.START_PRICE),
	endPrice: parseInt(process.env.END_PRICE),
	euroAvailable: parseFloat(process.env.EURO_AVAILABLE),
	cryptoCoinsAvailable: parseFloat(process.env.CRYPTO_COINS_AVAILABLE),
	sellLimit: parseFloat(process.env.SELL_LIMIT),
	buyLimit: parseFloat(process.env.BUY_LIMIT),
	loopTime: parseInt(process.env.LOOP_TIME),
	coinName: process.env.COIN_NAME,
	tsym: process.env.TSYM,
	apiKey: process.env.API_KEY,
}

const manager = new Manager(config);

manager.createRobots((robots) => {
	console.log(robots);
}).start({
	limit: 1450,
	timeType: "minute",
}, true, false)









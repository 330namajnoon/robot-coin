const { fstat } = require("fs");
const fs = require("fs");
const Manager = require("./modules/Manager.js");
const calculateBollingerBands = require("./utils/calculateBollingerBands.js");
require("dotenv").config();

const managerConfig = {
	robotUnits: 1,
	availableCash: 1000,
	availableCriptos: 0,
	sellLimit: 1,
	buyLimit: 1,
	intervalTime: 60000,
	coinName: "SOL",
	cashAmount: "EUR",
	databasePath: "./database/",
	apiKey: "2d779708c407542d3790b8ba4c6142656ab97ec6708187c255aa7928dc2a45cb",
};

const manager = new Manager(managerConfig);

manager
	.createRobots((robots) => {
		//console.log(robots);
	})
	.start({
		// analysisConfig: {
		// 	totalDataLimit: 100,
		// 	timeType: "minute",
		// },
		analysisConfig: null,
		simulationConfig: {
			totalDataLimit: 1400,
			timeType: "minute",
			analysisLength: 300,
		},
		deleteData: true,
		deletePrices: false,
	});


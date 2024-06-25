const axios = require("axios");
const fs = require("fs");
const calculateBollingerBands = require("../utils/calculateBollingerBands");

class Robot {
	constructor(
		name = "robot1",
		availableCash = 1000,
		availableCriptos = 0,
		sellLimit = 2,
		buyLimit = -2,
		lastDataPath = "",
		logPath = ""
	) {
		this.name = name;
		this.availableCash = availableCash;
		this.availableCriptos = availableCriptos;
		this.sellLimit = sellLimit;
		this.buyLimit = buyLimit;
		this.lastDataPath = lastDataPath;
		this.logPath = logPath;
	}

	buy = (cash, price) => {
		const data = {
			availableCash: 0,
			availableCriptos: parseFloat((cash / price).toFixed(3)),
		};
		this.buyCallback?.(data);
		return data;
	};
	sell = async (coin, price) => {
		const data = {
			availableCash: parseFloat((coin * price).toFixed(3)),
			availableCriptos: 0,
		};
		this.sellCallback?.(data);
		return data;
	};

	readFile = (path = "", parse = false) => {
		return new Promise((resolve) => {
			fs.readFile(path, (err, data) => {
				if (err) return resolve(null);
				resolve(parse ? JSON.parse(data.toString()) : data.toString());
			});
		});
	};

	writeFile = (path = "", data, apend = false) => {
		return new Promise((resolve) => {
			if (apend)
				fs.appendFile(path, data, (err) => {
					if (err) return resolve(false);
					return resolve(true);
				});
			else
				fs.writeFile(path, data, (err) => {
					if (err) return resolve(false);
					return resolve(true);
				});
		});
	};

	tradingSignal = (prices, numDeviations = 2) => {
		const { sma, upperBand, lowerBand } = calculateBollingerBands(prices, numDeviations);
		const latestPrice = prices[prices.length - 1];
		let signal = "hold";

		if (latestPrice <= lowerBand) {
			signal = "buy";
		} else if (latestPrice >= upperBand) {
			signal = "sell";
		}

		return { signal, sma, upperBand, lowerBand };
	};

	calculate = async (prices) => {
		try {
			const { signal, sma, upperBand, lowerBand } = this.tradingSignal(prices, 2);
			const lastPrice = prices[prices.length - 1];
			const { availableCash, availableCriptos } = (await this.readFile(this.lastDataPath, true)) || {
				availableCash: this.availableCash,
				availableCriptos: this.availableCriptos,
			};
			let buyData = {};
			let sellData = {};

			if (signal.includes("buy") && availableCash > 0) {
				buyData = this.buy(availableCash, lastPrice);
			} else if (signal.includes("sell") && availableCriptos) {
				sellData = this.sell(availableCriptos, lastPrice);
			}
			const data = {
				...{ ...{ availableCash, availableCriptos }, ...buyData, ...sellData },
				price: lastPrice,
				sma,
				upperBand,
				lowerBand,
				buy: !!buyData?.availableCash,
				sell: !!sellData?.availableCash,
				date: new Date() + "",
			};
			await this.writeFile(this.lastDataPath, JSON.stringify(data));
			await this.writeFile(this.logPath, `${JSON.stringify(data)}\n`, true);
			return data;
		} catch (error) {
			console.log(error);
		}
	};

	start = (logCallback = () => {}) => {
		this.logCallback = logCallback;
	};

	buyListener = (buyCallback) => {
		this.buyCallback = buyCallback;
	};

	sellListener = (sellCallback) => {
		this.sellCallback = sellCallback;
	};
}

module.exports = Robot;


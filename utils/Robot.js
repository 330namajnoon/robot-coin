const axios = require("axios");
const fs = require("fs");

class Robot {
	constructor(
		name = "robot1",
		buyStart = 100,
		buyEnd = 130,
		euroAvailable = 1000,
		cryptoCoinsAvailable = 0,
		sellLimit = 2,
		buyLimit = -2,
		lastDataPath = "",
		logPath = ""
	) {
		this.name = name;
		this.buyStart = buyStart;
		this.buyEnd = buyEnd;
		this.euroAvailable = euroAvailable;
		this.cryptoCoinsAvailable = cryptoCoinsAvailable;
		this.sellLimit = sellLimit;
		this.buyLimit = buyLimit;
		this.lastDataPath = lastDataPath;
		this.logPath = logPath;
	}

	getLastData = () => {
		return new Promise((resolve, reject) => {
			fs.readFile(this.lastDataPath, (err, data) => {
				if (err) return reject();
				if (data.toString() === "") return resolve(null);
				const dataArray = data.toString().split(" ");
				const response = {
					euro: parseFloat(dataArray[0]),
					coin: parseFloat(dataArray[1]),
					lastPrice: parseFloat(dataArray[2]),
				};
				return resolve(response);
			});
		});
	};

	update = (data) => {
		return new Promise((resolve, reject) => {
			fs.writeFile(this.lastDataPath, data, (err) => {
				if (err) return reject();

				fs.appendFile(this.logPath, `${data} ${new Date()}\n`, (err) => {
					if (err) return reject();
					return resolve();
				});
			});
		});
	};

	getPriceRice = (actualPrice, lastPrice) =>
		((actualPrice - lastPrice) / lastPrice) * 100;

	buy = async (euro, price) => {
		this.euroAvailable = 0;
		this.cryptoCoinsAvailable = (euro / price).toFixed(3);
		const data = `${this.euroAvailable} ${this.cryptoCoinsAvailable} ${price}`;
		try {
			await this.update(data);
			this.buyCallback?.(data);
			return `Buy: ${data}`;
		} catch (error) {
			return "Error....";
		}
	};
	sell = async (coin, price) => {
		this.euroAvailable = (coin * price).toFixed(3);
		this.cryptoCoinsAvailable = 0;
		const data = `${this.euroAvailable} ${this.cryptoCoinsAvailable} ${price}`;
		try {
			await this.update(data);
			this.sellCallback?.(data);
			return `Sell: ${data}`;
		} catch (error) {
			return "Error....";
		}
	};

	guessedPricesValidation = (guessedPrices = []) => {
		return guessedPrices[guessedPrices.length - 1] > guessedPrices[0]
			? "UP"
			: "DOWN";
	};

	calculate = (lastPrice = 0, guessedPrices = []) => {
		return new Promise((resolve, reject) => {
			const guesse = this.guessedPricesValidation(guessedPrices);
			console.log(guesse);
			this.getLastData()
				.then((lastData) => {
					if (lastData) {
						const priceRise = this.getPriceRice(
							lastPrice,
							lastData.lastPrice
						);
						if ((guesse === "UP") && lastData.euro > 0)
							this.buy(lastData.euro, lastPrice)
								.then((data) => {
									return resolve(data);
								})
								.catch((err) => {
									return resolve(err);
								});
						if ((guesse === "DOWN") && lastData.coin > 0)
							this.sell(lastData.coin, lastPrice)
								.then((data) => {
									return resolve(data);
								})
								.catch((err) => {
									return resolve(err);
								});
					} else {
						if (guesse === "UP" && this.euroAvailable > 0)
							this.buy(this.euroAvailable, lastPrice)
								.then((data) => {
									return resolve(data);
								})
								.catch((err) => {
									return resolve(err);
								});
					}
					return resolve("Not change!!");
				})
				.catch(() => {
					if (guesse === "UP" && this.euroAvailable > 0)
						this.buy(this.euroAvailable, lastPrice)
							.then((data) => {
								return resolve(data);
							})
							.catch((err) => {
								return resolve(err);
							});
					return resolve("Not change!!");
				});
		});
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


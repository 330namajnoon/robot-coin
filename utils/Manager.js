const axios = require("axios");
const Robot = require("./Robot");
const fs = require("fs");
const { exec } = require("child_process");
const tf = require("@tensorflow/tfjs");

class Manager {
	constructor({
		robotsUnit = 10,
		startPrice = 100,
		endPrice = 200,
		euroAvailable = 1000,
		cryptoCoinsAvailable = 0,
		sellLimit = -2,
		buyLimit = 2,
		loopTime = 1000,
		databasePath = "./database/",
		coinName = "SOL",
		tsym = "EUR",
		apiKey = "",
	}) {
		this.robotsUnit = robotsUnit;
		this.startPrice = startPrice;
		this.endPrice = endPrice;
		this.euroAvailable = euroAvailable;
		this.cryptoCoinsAvailable = cryptoCoinsAvailable;
		this.sellLimit = sellLimit;
		this.buyLimit = buyLimit;
		this.loopTime = loopTime;
		this.databasePath = databasePath;
		this.coinName = coinName;
		this.tsym = tsym;
		this.apiKey = apiKey;
		this.robots = [];
	}

	predictNextNumbers = async (prices, windowSize, n) => {
		const sequence = prices;

		// Crear datos de entrenamiento
		function createTrainingData(sequence, windowSize) {
			const inputs = [];
			const outputs = [];
			for (let i = 0; i < sequence.length - windowSize; i++) {
				inputs.push(sequence.slice(i, i + windowSize));
				outputs.push(sequence[i + windowSize]);
			}
			return { inputs, outputs };
		}

		// Normalizar los datos
		function normalizeData(data, min, max) {
			return data.map((x) => (x - min) / (max - min));
		}

		// Desnormalizar los datos
		function denormalizeData(data, min, max) {
			return data.map((x) => x * (max - min) + min);
		}

		// Generar datos de entrenamiento
		const { inputs, outputs } = createTrainingData(sequence, windowSize);
		const min = Math.min(...sequence);
		const max = Math.max(...sequence);
		const normalizedInputs = inputs.map((input) =>
			normalizeData(input, min, max)
		);
		const normalizedOutputs = normalizeData(outputs, min, max);

		const inputTensor = tf.tensor2d(normalizedInputs, [
			inputs.length,
			windowSize,
		]);
		const outputTensor = tf.tensor2d(normalizedOutputs, [
			outputs.length,
			1,
		]);

		// Crear y entrenar el modelo
		const model = tf.sequential();
		model.add(
			tf.layers.dense({
				units: 10,
				activation: "relu",
				inputShape: [windowSize],
			})
		);
		model.add(tf.layers.dense({ units: 1 }));
		model.compile({ optimizer: "sgd", loss: "meanSquaredError" });

		await model.fit(inputTensor, outputTensor, { epochs: 200 });

		// Predecir los siguientes números
		let input = sequence.slice(-windowSize);
		const predictions = [];
		for (let i = 0; i < n; i++) {
			const normalizedInput = normalizeData(input, min, max);
			const inputTensor = tf.tensor2d([normalizedInput], [1, windowSize]);
			const prediction = model.predict(inputTensor).dataSync()[0];
			const denormalizedPrediction = denormalizeData(
				[prediction],
				min,
				max
			)[0];
			predictions.push(denormalizedPrediction);
			input = input.slice(1).concat(denormalizedPrediction);
		}

		return predictions;
	};

	createRobots = (callback = (robots = [new Robot()]) => {}) => {
		for (let index = 0; index < this.robotsUnit; index++) {
			const robot = new Robot(
				`robot0${index}`,
				this.startPrice +
					((this.endPrice - this.startPrice) / this.robotsUnit) *
						index,
				this.startPrice +
					((this.endPrice - this.startPrice) / this.robotsUnit) *
						(index + 1),
				this.euroAvailable / this.robotsUnit,
				this.cryptoCoinsAvailable,
				this.sellLimit,
				this.buyLimit,
				`${this.databasePath}robot0${index}_last_data.txt`,
				`${this.databasePath}robot0${index}_log.txt`
			);
			this.robots.push(robot);
		}
		callback(this.robots);
		return this;
	};

	updateTotalData = async (allLastDatas = [""], lastPrice = 100) => {
		const total = {
			euro: 0,
			coin: 0,
		};
		let workingRobotsLenght = 0;
		for (let i = 0; i < allLastDatas.length; i++) {
			try {
				let data = await fs.readFileSync(allLastDatas[i]);
				workingRobotsLenght++;
				let array = data.toString().split(" ");
				total.euro +=
					parseFloat(array[0]) + parseFloat(array[1]) * lastPrice;
				total.coin += parseFloat(array[1]);
			} catch (error) {}
		}
		try {
			await fs.writeFileSync(
				"./database/total.json",
				JSON.stringify({
					euro: (
						total.euro +
						(this.robots.length - workingRobotsLenght) *
							(this.euroAvailable / this.robots.length)
					).toFixed(3),
					coin: total.coin.toFixed(3),
				})
			);
		} catch (error) {}
	};

	getLastPrice = () => {
		return new Promise((resolve, reject) => {
			axios
				.get(
					`https://min-api.cryptocompare.com/data/price?fsym=${this.coinName}&tsyms=${this.tsym}&api_key=${apiKey}`
				)
				.then((res) => {
					resolve(res.data.EUR);
				})
				.catch(() => reject(null));
		});
	};

	setTerminal = (comand = "") => {
		return new Promise((resolve, reject) => {
			exec("clear", (error, stdout, stderr) => {
				if (error || stderr) return reject();
				resolve(stdout);
			});
		});
	};

	simulation = async ({ prices = [100], maxSimulation, maxPriceUnit = 1000, windowSize = 5, n = 5 }) => {
		// try {
		// 	console.log(await this.setTerminal("clear"));
		// 	console.log(
		// 		"-------------------------------------------------------------------------------------------------------"
		// 	);
		// 	console.log(
		// 		"| " +
		// 			"#".repeat(Math.floor((100 / prices.length) * index)) +
		// 			" ".repeat(
		// 				100 - Math.floor((100 / prices.length) * index + 1)
		// 			) +
		// 			" | " +
		// 			Math.floor((100 / prices.length) * (index + 1)) +
		// 			"%"
		// 	);
		// 	console.log(
		// 		"-------------------------------------------------------------------------------------------------------"
		// 	);
		// } catch (error) {}
		try {
			const maxS = maxSimulation || prices.length;
			let guessedPrices = [];
			for (let nni = maxPriceUnit; nni < maxS; nni++) {
				if (nni % 5 === 0 || !guessedPrices.length)
					guessedPrices = await this.predictNextNumbers(
						prices.slice(nni, maxPriceUnit + nni),
						windowSize,
						n
					);
				for (let i = 0; i < this.robots.length; i++) {
					const lastData = await this.robots[i].calculate(
						prices[nni],
						guessedPrices
					);
					this.robots[i].logCallback(lastData);
				}
				//console.log(guessedPrices)
				await this.updateTotalData(
					this.robots.map((r) => r.lastDataPath),
					prices[nni]
				);
				let data = await this.getData("./database/total.json");
				console.log(JSON.parse(data.toString()));
			}
		} catch (error) {
			console.log(error);
		}
	};

	saveData = (path, data) => {
		return new Promise((resolve, reject) => {
			fs.writeFile(path, data, (err) => {
				if (err) reject();
				resolve();
			});
		});
	};

	getData = (path) => {
		return new Promise((resolve, reject) => {
			fs.readFile(path, (err, data) => {
				if (err) return reject();
				resolve(data.toString());
			});
		});
	};

	update = async (config = null) => {
		if (!config) {
			try {
				const lastPrice = await this.getLastPrice();
				this.robots.forEach((r) => {
					r.calculate(price).then((lastData) => {
						r.logCallback(lastData);
					});
				});
				setTimeout(() => {
					this.update();
				}, this.loopTime);
			} catch (error) {
				robots.forEach((r) => r.logCallback("Error!"));
				setTimeout(() => {
					this.update();
				}, this.loopTime);
			}
		} else {
			try {
				const prices = JSON.parse(
					await this.getData("./database/prices.json")
				);
				// let k = 0;
				// let i = 1000;
				// let j = 1005;
				// const compatibles = [];
				// for (let index = 0; index < 100; index++) {
				// 	const res = await this.predictNextNumbers(
				// 		prices.slice(k, i),
				// 		5,
				// 		5
				// 	);
				// 	const realData = prices.slice(i, j);
				// 	compatibles.push(realData[4] > realData[0] === res[4] > res[0]);
				// 	console.log("#".repeat(index) + " " + index);
				// 	k += 1;
				// 	i += 1;
				// 	j += 1;
				// }
				// console.log("trues: " + compatibles.filter(t => t).length);
				// console.log("falses: " + compatibles.filter(t => !t).length);
				this.simulation({ prices, maxSimulation: 1400, windowSize: 5, maxPriceUnit: 1000 });
			} catch (error) {
				axios
					.get(
						`https://min-api.cryptocompare.com/data/v2/histo${config.timeType}?fsym=${this.coinName}&tsym=${this.tsym}&limit=${config.limit}&api_key=${this.apiKey}`
					)
					.then(async (data) => {
						const prices = data.data.Data.Data.map((d) =>
							d.close > d.open
								? d.open + (d.close - d.open) / 2
								: d.close + (d.open - d.close) / 2
						);
						try {
							await this.saveData(
								"./database/prices.json",
								JSON.stringify(prices)
							);
						} catch (error) {
							console.log(error);
						}
						this.simulation({prices: prices, maxSimulation: 1100});
					})
					.catch(() => {});
			}
		}
	};

	/**
	 *
	 * @param {{limit: number, timeType: keyof {minute: "minute"; hour: "hour", day: "day"}}} config
	 */
	start = async (config = null, deleteData = false, deletePrices = true) => {
		if (deleteData) {
			for (let index = 0; index < this.robots.length; index++) {
				try {
					await fs.rmSync(this.robots[index].lastDataPath);
					await fs.rmSync(this.robots[index].logPath);
				} catch (error) {}
			}
		}
		if (deletePrices) {
			try {
				await fs.rmSync("./database/prices.json");
			} catch (error) {
				console.log(error);
			}
		}
		this.robots.forEach((r, i) => {
			r.start((log) => {
				//console.log(log);
			});

			r.buyListener((data) => {
				//console.log("buy " + data);
			});

			r.sellListener((data) => {
				//console.log("sell " + data);
			});
		});
		this.update(config);
	};
}

module.exports = Manager;


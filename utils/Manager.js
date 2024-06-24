const axios = require("axios");
const Robot = require("./Robot");
const fs = require("fs");
const { exec } = require("child_process");
const tf = require("@tensorflow/tfjs");

class Manager {
	constructor({
		robotUnits = 1,
		availableCash = 1000,
		availableCriptos = 0,
		sellLimit = 1,
		buyLimit = 1,
		intervalTime = 60000,
		coinName = "SOL",
		cashAmount = "EUR",
		databasePath = "./database/",
		apiKey = "2d779708c407542d3790b8ba4c6142656ab97ec6708187c255aa7928dc2a45cb",
	}) {
		this.robotUnits = robotUnits;
		this.availableCash = availableCash;
		this.availableCriptos = availableCriptos;
		this.sellLimit = sellLimit;
		this.buyLimit = buyLimit;
		this.intervalTime = intervalTime;
		this.databasePath = databasePath;
		this.coinName = coinName;
		this.cashAmount = cashAmount;
		this.apiKey = apiKey;
		this.robots = [];
	}

	predictNextPrices = async (prices, windowSize, n) => {
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
		for (let index = 0; index < this.robotUnits; index++) {
			const robot = new Robot(
				`robot0${index}`,
				this.availableCash / this.robotUnits,
				this.availableCriptos / this.robotUnits,
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
					`https://min-api.cryptocompare.com/data/price?fsym=${this.coinName}&tsyms=${this.tsym}&api_key=${this.apiKey}`
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

	simulation = async ({
		prices = [100],
		maxSimulation,
		maxPriceUnit = 1000,
		windowSize = 5,
		n = 5,
	}) => {
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

	appendData = (path, data) => {
		return new Promise((resolve, reject) => {
			fs.appendFile(path, data, (err) => {
				if (err) return reject(err);
				resolve(data);
			})
		})
	}

	getData = (path) => {
		return new Promise((resolve, reject) => {
			fs.readFile(path, (err, data) => {
				if (err) return reject();
				resolve(data.toString());
			});
		});
	};

	getPrices = ({ limit = 10, timeType = "minute" }) => {
		return new Promise((resolve, reject) => {
			axios
				.get(
					`https://min-api.cryptocompare.com/data/v2/histo${timeType}?fsym=${this.coinName}&tsym=${this.tsym}&limit=${limit}&api_key=${this.apiKey}`
				)
				.then(async (data) => {
					const prices = data.data.Data.Data.map((d) =>
						d.close > d.open
							? d.open + (d.close - d.open) / 2
							: d.close + (d.open - d.close) / 2
					);
					let strData = "";
					prices.forEach(p => {
						strData += `${p}\n`;
					});
					try {
						await this.appendData(
							"./database/prices.txt",
							strData
						);
					} catch (error) {
						console.log(error);
					}
					return resolve(strData);
				})
				.catch((error) => {
					return reject(error)
				});
		});
	};

	timeout = (time = 1000) => {
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(time);
			}, time);
		})
	}

	strToArray = (str, splitValue = "\n", mapFunc = (value) => value) => {
		if (str.length === 0)
			return [];
		return str.split(splitValue).map(value => mapFunc(value));
	}

	update = async ({ analysisConfig, simulationConfig = null}) => {
		if (analysisConfig) {
			try {
				let index = 0;
				while (true) {
					const lastPrice = await this.getLastPrice();
					let prices = this.strToArray(await this.getData(`${this.databasePath}prices.txt`), "\n", (value) => parseFloat(value));
					console.log(prices)
					// if (prices.length > 0)
					// 	prices = prices.split("\n").map(t => parseFloat(t));
					// if (index % 10 === 0) {
					// 	const priceNewData = await this.getPrices({ limit: prices.length > 1 ? 10 : 1000, timeType: "minute"});
					// 	if (prices.length === 0) {
					// 		prices = priceNewData.split("\n").map(t => parseFloat(t));
					// 	}
					// 	if (prices.length > 1010) {
					// 		let deletedData = "";
					// 		prices.slice(10, prices.length - 1).forEach(p => deletedData += `${p}\n`);
					// 		await this.saveData("./database/prices.txt", deletedData);
					// 	}
					// }
					// const guessedPrices = await this.predictNextNumbers(
					// 	prices.slice(0, prices.length - 1),
					// 	1,
					// 	10
					// );
					// this.robots.forEach((r) => {
					// 	r.calculate(lastPrice, guessedPrices).then((lastData) => {
					// 		r.logCallback(lastData);
					// 	});
					// });
					// await this.updateTotalData(
					// 	this.robots.map((r) => r.lastDataPath),
					// 	lastPrice
					// );
					// await this.timeout(this.loopTime);
					index++;
				}
			} catch (error) {
				console.log(error)
				this.robots.forEach((r) => r.logCallback("Error!"));
				setTimeout(() => {
					this.update();
				}, this.loopTime);
			}
		} 
		if (simulationConfig && !analysisConfig) {
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
				this.simulation({
					prices,
					maxSimulation: 1400,
					windowSize: 1,
					n: 10,
					maxPriceUnit: 1000,
				});
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
						this.simulation({
							prices: prices,
							maxSimulation: 1100,
						});
					})
					.catch(() => {});
			}
		}
	};

	/**
	 *
	 * @param {{analysisConfig: {maxAnalysisLength: 1000, windowSize: 1, predictPricesCount: 10}, simulationConfig: {maxAnalysisLength: 1000, windowSize: 1, predictPricesCount: 10} | null, deleteData: boolean, deletePrices: boolean}} config
	 */
	start = async ({analysisConfig = {maxAnalysisLength: 1000, windowSize: 1, predictPricesCount: 10}, simulationConfig = null, deleteData = false, deletePrices = true}) => {
		if (deleteData) {
			for (let index = 0; index < this.robots.length; index++) {
				try {
					await fs.rmSync(this.robots[index].lastDataPath);
					await fs.rmSync(this.robots[index].logPath);
				} catch (error) {
					console.log(error);
				}
			}
		}
		if (deletePrices) {
			try {
				await fs.rmSync(`${this.databasePath}prices.txt`);
			} catch (error) {
				console.log(error);
			}
		}
		this.robots.forEach((r, i) => {
			r.start((log) => {
				console.log(log);
			});

			r.buyListener((data) => {
				console.log("buy " + data);
			});

			r.sellListener((data) => {
				console.log("sell " + data);
			});
		});
		this.update({analysisConfig, simulationConfig});
	};
}

module.exports = Manager;


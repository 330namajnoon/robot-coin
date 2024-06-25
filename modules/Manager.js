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
		const normalizedInputs = inputs.map((input) => normalizeData(input, min, max));
		const normalizedOutputs = normalizeData(outputs, min, max);

		const inputTensor = tf.tensor2d(normalizedInputs, [inputs.length, windowSize]);
		const outputTensor = tf.tensor2d(normalizedOutputs, [outputs.length, 1]);

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
			const denormalizedPrediction = denormalizeData([prediction], min, max)[0];
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
			cash: 0,
			cripto: 0,
		};
		let workingRobotsLenght = 0;
		for (let i = 0; i < allLastDatas.length; i++) {
			try {
				let data = await this.readFile(allLastDatas[i], true);
				console.log(data);
				total.cripto = data.availableCriptos;
				total.cash = data.availableCash > 0 ? data.availableCash : data.availableCriptos * data.price;
				await this.saveData("./database/total.json", JSON.stringify(total));
				workingRobotsLenght++;
			} catch (error) {
				console.log(error);
			}
		}
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
					guessedPrices = await this.predictNextNumbers(prices.slice(nni, maxPriceUnit + nni), windowSize, n);
				for (let i = 0; i < this.robots.length; i++) {
					const lastData = await this.robots[i].calculate(prices[nni], guessedPrices);
					this.robots[i].logCallback(lastData);
				}
				//console.log(guessedPrices)
				await this.updateTotalData(
					this.robots.map((r) => r.lastDataPath),
					prices[nni]
				);
				let data = await this.readFile("./database/total.json", true);
				console.log(data);
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
			});
		});
	};

	readFile = (path = "", parse = false) => {
		return new Promise((resolve) => {
			fs.readFile(path, (err, data) => {
				if (err) return resolve(null);
				resolve(parse ? JSON.parse(data.toString()) : data.toString());
			});
		});
	};

	getPrices = ({ limit = 10, timeType = "minute" }) => {
		return new Promise((resolve, reject) => {
			axios
				.get(
					`https://min-api.cryptocompare.com/data/v2/histo${timeType}?fsym=${this.coinName}&tsym=${this.cashAmount}&limit=${limit}&api_key=${this.apiKey}`
				)
				.then(async (data) => {
					const prices = data.data.Data.Data.map((d) => d.close);
					let strData = "";
					prices.forEach((p) => {
						strData += `${p}\n`;
					});
					if (limit <= 1) strData = prices[0] + "\n";
					try {
						await this.appendData("./database/prices.txt", strData);
					} catch (error) {
						console.log(error);
					}
					return resolve(strData.slice(0, strData.length - 1));
				})
				.catch((error) => {
					return reject(error);
				});
		});
	};

	timeout = (time = 1000) => {
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(time);
			}, time);
		});
	};

	strToArray = (str, splitValue = "\n", mapFunc = (value) => value) => {
		if (str.length === 0) return [];
		return str.split(splitValue).map((value) => mapFunc(value));
	};

	analysis = async ({ analysisConfig, simulationConfig = null }) => {
		if (analysisConfig) {
			const { totalDataLimit, timeType } = analysisConfig;
			while (true) {
				try {
					const savedPrices = this.strToArray(
						(await this.readFile("./database/prices.txt")) || "",
						"\n",
						(value) => parseFloat(value)
					);
					const prices = this.strToArray(
						await this.getPrices({ limit: savedPrices.length > 0 ? 1 : totalDataLimit, timeType }),
						"\n",
						(value) => parseFloat(value)
					);
					const allPrices = [...savedPrices.slice(0, savedPrices.length - 1), ...prices];
					for (let index = 0; index < this.robots.length; index++) {
						const data = await this.robots[index].calculate(allPrices);
					}
					await this.updateTotalData(
						this.robots.map((r) => r.lastDataPath),
						prices[prices.length - 1]
					);
					await this.saveData(
						"./database/prices.txt",
						allPrices.slice(1, allPrices.length).reduce((pv, cv) => (pv += `${cv}\n`), "")
					);
					await this.timeout(this.intervalTime);
				} catch (error) {
					console.log(error);
					this.robots.forEach((r) => r.logCallback("Error!"));
					await this.timeout(this.intervalTime);
				}
			}
		}
		if (!analysisConfig && simulationConfig) {
			const { totalDataLimit, timeType, analysisLength } = simulationConfig;
			let whileIndex = 0;
			const savedPrices = this.strToArray((await this.readFile("./database/prices.txt")) || "", "\n", (value) =>
				parseFloat(value)
			);
			let prices = [];
			if (savedPrices.length === 0)
				prices = this.strToArray(await this.getPrices({ limit: totalDataLimit, timeType }), "\n", (value) =>
					parseFloat(value)
				);
			const allPrices = [...savedPrices, ...prices];
			while (allPrices[whileIndex + analysisLength]) {
				try {
					for (let index = 0; index < this.robots.length; index++) {
						const data = await this.robots[index].calculate(
							allPrices.slice(whileIndex, whileIndex + analysisLength)
						);
					}
					await this.updateTotalData(
						this.robots.map((r) => r.lastDataPath),
						prices[prices.length - 1]
					);
					await this.saveData(
						"./database/prices.txt",
						allPrices.slice(1, allPrices.length).reduce((pv, cv) => (pv += `${cv}\n`), "")
					);
				} catch (error) {
					console.log(error);
					this.robots.forEach((r) => r.logCallback("Error!"));
					await this.timeout(this.intervalTime);
				}
				whileIndex++;
			}
		}
	};

	/**
	 *
	 * @param {{analysisConfig: {maxAnalysisLength: 1000, windowSize: 1, predictPricesCount: 10}, simulationConfig: {maxAnalysisLength: 1000, windowSize: 1, predictPricesCount: 10} | null, deleteData: boolean, deletePrices: boolean}} config
	 */
	start = async ({
		analysisConfig = { totalDataLimit: 1400, timeType: "minute" },
		simulationConfig = null,
		deleteData = false,
		deletePrices = true,
	}) => {
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
				await fs.rmSync(`${this.databasePath}prices.txt`);
			} catch (error) {}
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
		this.analysis({ analysisConfig, simulationConfig });
	};
}

module.exports = Manager;


function calculateSMA(prices) {
	const sum = prices.reduce((a, b) => a + b, 0);
	return sum / prices.length;
}

function calculateStandardDeviation(prices, sma) {
	const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / prices.length;
	return Math.sqrt(variance);
}

function calculateBollingerBands(prices, numDeviations) {
	const sma = calculateSMA(prices);
	const stdDev = calculateStandardDeviation(prices, sma);

	const upperBand = sma + numDeviations * stdDev;
	const lowerBand = sma - numDeviations * stdDev;

	return {
		sma: sma,
		upperBand: upperBand,
		lowerBand: lowerBand,
	};
}

module.exports = calculateBollingerBands;
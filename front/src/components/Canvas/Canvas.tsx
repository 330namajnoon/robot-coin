import { useEffect, useRef, useState } from "react";
import { CanvasManager } from "../../modules";
import scripts from "../../scripts";
import useData from "../../hooks/useData";
import useSearchParams from "../../hooks/useSearchParams";

export type Data = {
	availableCash: number;
	availableCriptos: number;
	buy: boolean;
	date: string;
	lowerBand: number;
	price: number;
	sell: boolean;
	sma: number;
	upperBand: number;
};

const initialData = [
	{
		availableCash: 1000,
		availableCriptos: 0,
		price: 121.82,
		sma: 119.97158415841582,
		upperBand: 123.17843293418922,
		lowerBand: 116.76473538264243,
		buy: false,
		sell: false,
		date: "Mon Jun 24 2024 23:56:00 GMT+0200 (Central European Summer Time)",
	},
	{
		availableCash: 1000,
		availableCriptos: 0,
		price: 122.02,
		sma: 120.00465346534651,
		upperBand: 123.22639466403676,
		lowerBand: 116.78291226665625,
		buy: false,
		sell: false,
		date: "Mon Jun 24 2024 23:56:01 GMT+0200 (Central European Summer Time)",
	},
	{
		availableCash: 1000,
		availableCriptos: 0,
		price: 122.02,
		sma: 120.03702970297027,
		upperBand: 123.27337594318777,
		lowerBand: 116.80068346275277,
		buy: false,
		sell: false,
		date: "Mon Jun 24 2024 23:56:02 GMT+0200 (Central European Summer Time)",
	},
	{
		availableCash: 1000,
		availableCriptos: 0,
		price: 122.02,
		sma: 120.07059405940593,
		upperBand: 123.31817085203413,
		lowerBand: 116.82301726677774,
		buy: false,
		sell: false,
		date: "Mon Jun 24 2024 23:56:03 GMT+0200 (Central European Summer Time)",
	},
	{
		availableCash: 1000,
		availableCriptos: 0,
		price: 122.02,
		sma: 120.10811881188118,
		upperBand: 123.35734258864014,
		lowerBand: 116.85889503512223,
		buy: false,
		sell: false,
		date: "Mon Jun 24 2024 23:56:04 GMT+0200 (Central European Summer Time)",
	},
	{
		availableCash: 1000,
		availableCriptos: 0,
		price: 122.02,
		sma: 120.14792079207922,
		upperBand: 123.39135659025445,
		lowerBand: 116.90448499390399,
		buy: false,
		sell: false,
		date: "Mon Jun 24 2024 23:56:05 GMT+0200 (Central European Summer Time)",
	},
	{
		availableCash: 1000,
		availableCriptos: 0,
		price: 122.02,
		sma: 120.19000000000003,
		upperBand: 123.41918743419279,
		lowerBand: 116.96081256580726,
		buy: false,
		sell: false,
		date: "Mon Jun 24 2024 23:56:07 GMT+0200 (Central European Summer Time)",
	},
];
const Canvas = () => {
	const [canvasManager, setCanvasManager] = useState<CanvasManager | null>(null);
	const search = useSearchParams();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const data: Data[] = useData({ dataPath: search.get("dataPath") || "robot00", intervalTime: 10000 });

	useEffect(() => {
		if (canvasRef.current) {
			const canvasManager = new CanvasManager(canvasRef.current);
			canvasManager.setData("priceLines", initialData);
			canvasManager.setScripts(scripts);
			canvasManager.anim();
			setCanvasManager(canvasManager);
		}
	}, []);
	useEffect(() => {
		if (canvasManager) {
			canvasManager.setData("priceLines", data);
		}
	}, [data, canvasManager]);
	return <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight}></canvas>;
};

export default Canvas;


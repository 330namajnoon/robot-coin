import { Data } from "../components/Canvas/Canvas";
import { Script } from "../modules";

class DrawPriceLines extends Script {
	initial = () => {
    };
    
    drawLine = (data: number[], color: string, zoomX: number) => {
        const { ctx } = this.manager;
        ctx.beginPath();
		for (let index = 0; index < data.length; index++) {
            const linePoint: number = data[index];
			if (index === 0) {
                ctx.moveTo(((window.innerWidth / 2) + index) * zoomX, ((window.innerHeight / 2) - linePoint));
			} else {
                ctx.lineTo(((window.innerWidth / 2) + index) * zoomX, ((window.innerHeight / 2) - linePoint));
            }
            
		}
        ctx.lineWidth = 0.1;
        ctx.strokeStyle = color;
        ctx.stroke();
    }
    
	draw = () => {
        const data = this.manager.getData("priceLines") as Data[];
        const prices = data.map(d => d.price);
        const sma = data.map(d => d.sma);
        const upperBand = data.map(d => d.upperBand);
        const lowerBand = data.map(d => d.lowerBand);
        const linesData = [prices, sma, upperBand, lowerBand]
        const colors = ["red", "blue", "yellow", "grey"]
        linesData.forEach((line, index) => {
            this.drawLine(line, colors[index], 1);
        })
    };
}

export default DrawPriceLines;


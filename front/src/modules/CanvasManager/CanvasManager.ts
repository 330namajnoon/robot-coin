import Script from "../Script";

class CanvasManager {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	scripts: Script[] = [];
	frame: number = 0;
	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
	}

	setScripts = (scripts: any[]) => {
		scripts.forEach((Class) => {
			const script = new Class(this.ctx);
			script?.initial();
			this.scripts.push(script);
		});
	};

	draw() {
		this.scripts.forEach((script) => {
			script?.draw();
		});
	}

	update() {
		this.draw();
		this.scripts.forEach((script) => {
			script?.update(this.frame);
		});
	}

	anim() {
		this.update();
		this.frame++;
		requestAnimationFrame(this.anim.bind(this));
	}
}

export default CanvasManager;


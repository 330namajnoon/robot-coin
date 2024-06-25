import Script from "../Script";

class CanvasManager {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	scripts: Script[] = [];
	frame: number = 0;
	database: any = {};
	view = {
		zoom: 1,
		originX: 0,
		originY: 0,
		mouseIsDragging: false,
		mouseStartX: 0,
		mouseStartY: 0,
		zoomS: 1.1,
	};
	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
		window.document.addEventListener("wheel", this.handleScroll);
		window.document.addEventListener("mousedown", this.handleMouseDown);
		window.document.addEventListener("mousemove", this.handleMouseMove);
		window.document.addEventListener("mouseup", this.handleMouseUp);
		window.document.addEventListener("mouseout", this.handleMouseUp);
	}

	handleMouseDown = (event: MouseEvent) => {
		event.preventDefault();
		this.view.mouseIsDragging = true;
		const rect = this.canvas.getBoundingClientRect();
		this.view.mouseStartX = event.clientX - rect.left;
		this.view.mouseStartY = event.clientY - rect.top;
	};

	handleScroll = (event: WheelEvent) => {
		const rect = this.canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		this.view.originX = x;
		this.view.originY = y;

		if (event.deltaY < 0) {
			this.view.zoom *= this.view.zoomS;
			this.view.zoomS /= 1.001;
		} else {
			this.view.zoom /= this.view.zoomS;
			this.view.zoomS *= 1.001;
		}
	};

	handleMouseMove = (event: MouseEvent) => {
		if (this.view.mouseIsDragging) {
			const rect = this.canvas.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;

			const dx = x - this.view.mouseStartX;
			const dy = y - this.view.mouseStartY;

			this.view.originX -= dx;
			this.view.originY -= dy;

			this.view.mouseStartX = x;
			this.view.mouseStartY = y;
		}
	};

	handleMouseUp = () => {
		this.view.mouseIsDragging = false;
	};

	setScripts = (scripts: any[]) => {
		scripts.forEach((Class) => {
			const script = new Class(this);
			script?.initial();
			this.scripts.push(script);
		});
	};

	draw() {
		const { zoom, originX, originY } = this.view;
		this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
		this.ctx.save();
		this.ctx.translate(originX, originY);
		this.ctx.scale(zoom, zoom);
		this.ctx.translate(-originX, -originY);
		this.scripts.forEach((script) => {
			script?.draw();
		});
		this.ctx.restore();
	}

	update() {
		this.draw();
		this.scripts.forEach((script) => {
			script?.update(this.frame);
		});
	}

	getData(name: string): any | null {
		return this.database[name] || null;
	}

	setData(name: string, data: any) {
		this.database[name] = data;
		return this.database;
	}

	anim() {
		this.update();
		this.frame++;
		requestAnimationFrame(this.anim.bind(this));
	}
}

export default CanvasManager;


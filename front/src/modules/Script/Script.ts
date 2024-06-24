class Script {
	ctx: CanvasRenderingContext2D;
	constructor(ctx: CanvasRenderingContext2D) {
		this.ctx = ctx;
        this?.initial();
	}

    initial = () => {

    }

	draw = () => {};

	update = (frame: number = 0) => {};
}

export default Script;


import CanvasManager from "../CanvasManager";

class Script {
	manager: CanvasManager;

	constructor(manager: CanvasManager) {
		this.manager = manager;
        this?.initial();
	}

    initial = () => {

    }

	draw = () => {};

	update = (frame: number = 0) => {};
}

export default Script;


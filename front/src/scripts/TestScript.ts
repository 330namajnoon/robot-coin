import { Script } from "../modules";

class TestScript extends Script {
	initial = () => {
		console.log(this.ctx);
	};
}

export default TestScript;

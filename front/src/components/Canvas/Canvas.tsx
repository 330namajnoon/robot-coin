import { useEffect, useRef } from "react";
import { CanvasManager } from "../../modules";
import scripts from "../../scripts";

const Canvas = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
        if (canvasRef.current) {
            const canvasManager = new CanvasManager(canvasRef.current);
            canvasManager.setScripts(scripts);
            canvasManager.anim();
        }
    }, []);
	return <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight}></canvas>;
};

export default Canvas;


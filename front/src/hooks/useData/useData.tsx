import axios from "axios";
import { useEffect, useState } from "react";
import { apiUrl } from "../../constants";

type PropTypes = {
	dataPath: string;
	intervalTime: number;
};

const useData = ({ dataPath, intervalTime = 1000 }: PropTypes) => {
	const [data, setData] = useState<any[]>([]);
	useEffect(() => {
		if (!data.length)
			axios
				.get(`${apiUrl}robot-coin/version01/database/${dataPath}_log.txt`)
				.then((res) => {
					const strArray = res.data.split("\n");
					setData(JSON.parse(`[${strArray.slice(0, strArray.length - 1).join(",")}]`) as any);
				})
				.catch((err) => {
					console.log(err);
				});
		setInterval(() => {
			axios
				.get(`${apiUrl}robot-coin/version01/database/${dataPath}_log.txt`)
				.then((res) => {
					const strArray = res.data.split("\n");
					setData(JSON.parse(`[${strArray.slice(0, strArray.length - 1).join(",")}]`) as any);
				})
				.catch((err) => {
					console.log(err);
				});
			// axios
			// 	.get<any>(`${apiUrl}robot-coin/version01/database/${dataPath}_last_data.txt`)
			// 	.then((res: any) => {
			// 		setData([res.data]);
			// 	})
			// 	.catch((err) => {
			// 		console.log(err);
			// 	});
		}, intervalTime);
	}, []);
	return data;
};

export default useData;


import { useEffect, useState } from "react"

const useSearchParams = () => {
    const [search, setSearch] = useState(new URLSearchParams(window.location.search));
    useEffect(() => {
       setSearch(new URLSearchParams(window.location.search));
    }, [window.location.search])
    return search;
}

export default useSearchParams;
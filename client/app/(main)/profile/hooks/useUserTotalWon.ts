import { Game } from "@/entites/user/interface/game.interface"
import { useEffect, useState } from "react"
import { getTonBalanceByGames } from "../helpers/getTonBalanceByGames.helper";

const useUserTotalWon = () => {

    const [games, setGames] = useState<Game[]>([])
    const [tonBalance, setTonBalance] = useState<number>(0);


    useEffect(() => {
        getTonBalanceByGames(games)
            .then(balance => {
                setTonBalance(balance);
            })
            .catch(e => console.error(e))
    }, [games]) 

    return { tonBalance, setGames }
}

export { useUserTotalWon }
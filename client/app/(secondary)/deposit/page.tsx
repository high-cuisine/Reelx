'use client'
import cls from './deposit.module.scss';
import Image from 'next/image';

import starImage from '@/assets/star.svg';
import { useEffect, useState } from 'react';

interface cardsInerface {
    title:string;
    image:unknown;
    state:string

}

const DepositPage = () => {

    const [activeCard, setActiveCard] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState<string>('');

    const cards = [
        {
            title:'TG Stars',
            image:starImage,
            state:'stars'
        }
    ];

    const buttons = [
        10,
        25,
        50,
        100,
        250,
        500
    ]

    useEffect(() => {
        setActiveCard(cards[0].state)
    }, []);

    return (
        <div className={cls.deposit}>
            <h2 className={cls.header}>Депозит</h2>
            <div className={cls.cards}>
                {
                    cards.map(el => 
                        <div className={`${cls.card} ${el.state === activeCard ? cls.active : null}`}>
                            <Image src={starImage} alt={el.title} width={30} height={30}/>
                            <span>{el.title}</span>
                        </div>
                    )
                }
            </div>
            <div className={cls.inputContainer}>
                <input value={inputValue} onChange={(e) => setInputValue(e.target.value)}/>
            </div>

            <div className={cls.buttons}>
                {
                    buttons.map(el => 
                        <button key={el} onClick={() => setInputValue(String(el))}>{el}</button>
                    )
                }
            </div>
        </div>
    )
}

export default DepositPage;
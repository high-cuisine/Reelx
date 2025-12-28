'use client'
import cls from './deposit.module.scss';
import Image from 'next/image';

import starImage from '@/assets/star.svg';
import { useState } from 'react';

import tonImage from '@/assets/ton.svg'

interface cardsInerface {
    title:string;
    image:string;
    state:string

}

const DepositPage = () => {

    const cards = [
        {
            title:'TG Stars',
            image:starImage,
            state:'stars'
        }
    ];

    const [activeCard, setActiveCard] = useState<cardsInerface>(cards[0]);
    const [inputValue, setInputValue] = useState<string>('');

    const buttons = [
        10,
        25,
        50,
        100,
        250,
        500
    ]

    return (
        <div className={cls.deposit}>
            <h2 className={cls.header}>Депозит</h2>
            <div className={cls.cards}>
                {
                    cards.map(el => 
                        <div key={el.state} className={`${cls.card} ${el.state === activeCard.state ? cls.active : null}`}>
                            <Image src={starImage} alt={el.title} width={30} height={30}/>
                            <span>{el.title}</span>
                        </div>
                    )
                }
            </div>
            <div className={cls.inputContainer}>
                <Image className={cls.inputImage} src={activeCard.image} width={16} height={16} alt=''></Image>
                <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} className={cls.input}/>
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
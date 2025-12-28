'use client'
import cls from './deposit.module.scss';
import Image from 'next/image';

import starImage from '@/assets/star.svg';
import { useState } from 'react';

import tonImage from '@/assets/ton.svg'
import { Button } from '@/shared/ui/Button/Button';

interface cardsInerface {
    title:string;
    image:string;
    state:string
    item:string;

}

const DepositPage = () => {

    const cards = [
        {
            title:'TG Stars',
            image:starImage,
            state:'stars',
            item:'stars'
        },
        {
            title:'TG Stars',
            image:starImage,
            state:'stars1',
            item:'stars'
        },
        {
            title:'TG Stars',
            image:starImage,
            state:'stars2',
            item:'stars'
        },
        {
            title:'TG Stars',
            image:starImage,
            state:'stars3',
            item:'stars'
        }
    ];

    const [activeCard, setActiveCard] = useState<cardsInerface>(cards[0]);
    const [inputValue, setInputValue] = useState<number>(1);

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

            <a className={cls.close} href='/profile'>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.15672 4L7.76021 6.60349C8.07916 6.92243 8.08099 7.4377 7.75935 7.75935C7.43993 8.07876 6.92218 8.0789 6.60349 7.76021L4 5.15672L1.39651 7.76021C1.07757 8.07915 0.562301 8.08099 0.240654 7.75935C-0.078766 7.43993 -0.0788967 6.92217 0.239788 6.60349L2.84328 4L0.239788 1.39651C-0.0791539 1.07757 -0.080993 0.562301 0.240654 0.240654C0.560074 -0.078766 1.07783 -0.0788966 1.39651 0.239788L4 2.84328L6.60349 0.239788C6.92243 -0.0791538 7.4377 -0.0809929 7.75935 0.240654C8.07877 0.560074 8.0789 1.07783 7.76021 1.39651L5.15672 4Z" fill="white"/>
                </svg>
            </a>

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
                <input 
                    type="text" 
                    inputMode="numeric"
                    value={inputValue} 
                    onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setInputValue(Number(value));
                    }} 
                    className={cls.input}
                />
            </div>

            <div className={cls.buttons}>
                {
                    buttons.map(el => 
                        <button key={el} className={cls.button} onClick={() => setInputValue(Number(el))}>{el}</button>
                    )
                }
            </div>
        
            <div>
                <Button customClass={cls.depositButton} text={`Пополнить на ${inputValue} ${activeCard.item}`}></Button>
            </div>

        </div>
    )
}

export default DepositPage;
import cls from './error.module.scss';
import Image from 'next/image'
import errorImage from '@/assets/NFT.png'
import { Button } from '@/shared/ui/Button/Button';
import Link from 'next/link';

interface ErrorProps {
    errorText: string;
    errorSubText: string;
    button?:{
        link:string;
        text:string
    };
}

const Error = ({errorText, errorSubText, button}:ErrorProps) => {

    return (
        <div className={cls.error}>

            <div className={cls.info}>
                <Image src={errorImage} alt='error' width={100} height={100} />
                <span className={cls.header}>{errorText}</span>
                <p className={cls.content}>{errorSubText}</p>
            </div>


            <Link className={cls.button} href={button?.link ?? '/'}>
                <Button text={button?.text ?? 'Понятно'}></Button>
            </Link>
        </div>
    )
}

export { Error }
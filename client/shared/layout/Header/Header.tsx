'use client'
import cls from './Header.module.scss';
import Image from 'next/image';
import { useUserStore } from '@/entites/user/model/user';
import { useTelegram } from '@/shared/lib/hooks/useTelegram';
import tonIcon from '@/assets/ton.svg';
import starIcon from '@/assets/star.svg';
import Link from 'next/link';

const Header = () => {
    const { user } = useUserStore();
    const { photoUrl, usernameInitial } = useTelegram();

    const tonBalance = user?.tonBalance || 0;
    const starsBalance = user?.starsBalance || 0;
    const level = 5; // TODO: добавить level в модель пользователя

    return (
        <header className={cls.header}>
        <div className={cls.leftContainer}>
         <div className={cls.tonBalance}>
                 <Image src={tonIcon} alt="TON" width={20} height={20} />
                 <span className={cls.balanceValue}>{tonBalance.toFixed(2)}</span>
             </div>
             
             <div className={cls.starsBalance}>
                 <Image src={starIcon} alt="Stars" width={20} height={18} />
                 <span className={cls.balanceValue}>{starsBalance}</span>
             </div>
        </div>

         <div className={cls.rightContainer}>

             <Link href="/profile" className={cls.avatar}>
                 {photoUrl ? (
                     <Image 
                         src={photoUrl} 
                         alt="Avatar" 
                         width={40} 
                         height={40} 
                         className={cls.avatarImage}
                     />
                 ) : (
                     <span className={cls.avatarInitial}>
                         {usernameInitial.slice(0, 1).toUpperCase()}
                     </span>
                 )}
             </Link>
         </div>
     </header>
    )
}

export { Header };
import cls from './NavBar.module.scss';

import playImage from '@/assets/icons/game.svg';
import playActiveImage from '@/assets/icons/game-active.svg';
import profileImage from '@/assets/icons/profile.svg';
import profileActiveImage from '@/assets/icons/profile-active.svg';
import { NavBarLink } from './components/Link/Link';


const NavBar = () => {

    const links = [
        {
            title:'Играть',
            image:playImage,
            imageActive:playActiveImage,
            link:'/game/spin',
            isMainPage:true,
        },
        {
            title:'Профиль',
            image:profileImage,
            imageActive: profileActiveImage,
            link:'/profile',
            isMainPage:false,
        },
    ]
    return (
        <nav className={cls.navbar}>
            {
                links.map(el => 
                    <NavBarLink key={el.link} link={el.link} image={el.image} imageActive={el.imageActive} title={el.title} isMainPage={el.isMainPage}/>
                )
            }
        </nav>
    )
}

export { NavBar };
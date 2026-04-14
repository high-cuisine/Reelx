import { Header } from '@/shared/layout/Header/Header';
import { ButtonModes } from './components/ButtonModes/ButtonModes';

export default function GameLayout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <Header />
            <ButtonModes />
           
            
                {children}
        
        </div>
    );
}

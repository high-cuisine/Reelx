import { Header } from '@/shared/layout/Header/Header';
import { ButtonModes } from './components/ButtonModes/ButtonModes';
import { WinsStrip } from './components/WinsStrip/WinsStrip';

export default function GameLayout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <Header />
            <ButtonModes />
            <WinsStrip />
           
            
                {children}
        
        </div>
    );
}

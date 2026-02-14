import { NavBar } from '@/shared/layout/NavBar/NavBar';
import { WinModal } from '@/shared/layout/WinModal/WinModal';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <NavBar />
            {children}
            <WinModal />
        </div>
    )
}
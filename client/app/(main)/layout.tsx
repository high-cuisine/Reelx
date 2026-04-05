import { NavBar } from '@/shared/layout/NavBar/NavBar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <NavBar />
            {children}
        </div>
    )
}
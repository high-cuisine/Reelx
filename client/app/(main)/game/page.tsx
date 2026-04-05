'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { TablesList } from './components/TablesList/TablesList';
import { TableButton } from './components/TableButton/TableButton';
import { CreateTableModal } from './components/CreateTableModal/CreateTableModal';
import cls from './game.module.scss';
import starIcon from '@/assets/icons/grey-star.svg';

export default function GamePage() {
    const router = useRouter();
    const [createTableOpen, setCreateTableOpen] = useState(false);

    return (
        <div className={cls.gamePage}>
            <div className={cls.downContainer}>
                <div className={cls.pageHeader}>
                    <div className={cls.titleContainer}>
                        <h3 className={cls.title}>Столы</h3>
                        <Image src={starIcon} alt="Star" width={16} height={16} className={cls.starIcon} />
                    </div>
                </div>

                <TablesList />

                <TableButton onClick={() => setCreateTableOpen(true)} />
            </div>

            <CreateTableModal
                isOpen={createTableOpen}
                onClose={() => setCreateTableOpen(false)}
                onCreateTable={(ownerId) =>
                    router.push(`/table?owner=${encodeURIComponent(ownerId)}`)
                }
            />
        </div>
    );
}
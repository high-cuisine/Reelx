'use client';

import { Suspense } from 'react';
import TablePage from './Table';

function TableFallback() {
    return (
        <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            Загрузка…
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<TableFallback />}>
            <TablePage />
        </Suspense>
    );
}

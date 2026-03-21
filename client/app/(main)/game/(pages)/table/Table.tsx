'use client';

import Image from 'next/image';
import cls from './Table.module.scss';

import TonIcon from '@/assets/ton.svg';
import CopyIcon from './assets/copy-icon.svg';
import TableHighlights from './assets/table-highlights.svg';
import WheelSectors from './assets/wheel-sectors.svg';
import WheelRim from './assets/wheel-rim.svg';

interface Player {
    id: string;
    name: string;
    initial: string;
    color: string;
    bet: number;
}

const SEAT_POSITIONS: { left: string; top: string }[] = [
    { left: '102px', top: '0' },
    { left: '204px', top: '50px' },
    { left: '204px', top: '322px' },
    { left: '102px', top: '372px' },
    { left: '0', top: '322px' },
    { left: '0', top: '50px' },
];

const MOCK_PLAYERS: Player[] = [
    { id: '1', name: '@user125', initial: 'A', color: '#640E8C', bet: 10 },
    { id: '2', name: '@user125', initial: 'A', color: '#199CB3', bet: 10 },
];

const GAME_ID = '#123456';
const BANK = 60;
const STAKE = 10;
const MAX_PLAYERS = 6;
const HASH = '436c4...0d386';

function BankBadge() {
    return (
        <div className={cls.bank}>
            <span className={cls.bankLabel}>Банк</span>
            <span className={cls.bankAmount}>{BANK.toFixed(2)}</span>
            <Image src={TonIcon} alt="TON" width={15} height={15} />
        </div>
    );
}

function TableVisual() {
    return (
        <div className={cls.tableWrap}>
            <div className={cls.tableGlow} />

            <div className={cls.tableOuter}>
                <div className={cls.tableBorder} />

                <div className={cls.tableFeltInner}>
                    <div className={cls.tableCenterGlow} />
                </div>

                <div className={cls.wheel}>
                    <div className={cls.wheelSectors}>
                        <Image src={WheelSectors} alt="" fill sizes="214px" />
                    </div>
                    <div className={cls.wheelRim}>
                        <Image src={WheelRim} alt="" fill sizes="216px" />
                    </div>
                    <div className={cls.wheelStatus}>
                        <span className={cls.wheelStatusText}>Ожидание</span>
                    </div>
                </div>

                <div className={cls.seats}>
                    {SEAT_POSITIONS.map((pos, i) => {
                        const player = i < MOCK_PLAYERS.length ? MOCK_PLAYERS[i] : null;
                        return (
                            <div key={i} className={cls.seat} style={{ left: pos.left, top: pos.top }}>
                                <div className={cls.seatRing} />
                                <div
                                    className={`${cls.seatInner} ${!player ? cls.seatEmpty : ''}`}
                                    style={player ? { background: player.color } : undefined}
                                >
                                    {player ? (
                                        <span className={cls.seatAvatar}>{player.initial}</span>
                                    ) : (
                                        <span className={cls.seatPlus}>+</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className={cls.tableHighlights}>
                    <Image src={TableHighlights} alt="" fill sizes="316px" />
                </div>
            </div>
        </div>
    );
}

function PlayerRow({ player }: { player: Player }) {
    return (
        <div className={cls.playerRow}>
            <div className={cls.playerLeft}>
                <div className={cls.playerAvatar} style={{ background: player.color }}>
                    {player.initial}
                </div>
                <div className={cls.playerInfo}>
                    <span className={cls.playerName}>{player.name}</span>
                    <span className={cls.playerRole}>Игрок</span>
                </div>
            </div>
            <div className={cls.playerRight}>
                <span className={cls.playerBetLabel}>Ставка</span>
                <div className={cls.playerBetValue}>
                    <span className={cls.playerBetAmount}>{player.bet.toFixed(2)}</span>
                    <Image src={TonIcon} alt="TON" width={8} height={8} className={cls.playerBetIcon} />
                </div>
            </div>
        </div>
    );
}

export default function TablePage() {
    const handleCopyHash = () => {
        navigator.clipboard.writeText(HASH);
    };

    return (
        <div className={cls.page}>
            <BankBadge />

            <TableVisual />

            <button type="button" className={cls.playButton}>
                Играть за {STAKE} TON
            </button>

            <div className={cls.info}>
                <div className={cls.infoHeader}>
                    <span className={cls.infoPlayers}>Игроков ({MOCK_PLAYERS.length})</span>
                    <span className={cls.infoGameId}>ИГРА {GAME_ID}</span>
                </div>

                <div className={cls.playersList}>
                    {MOCK_PLAYERS.map((p) => (
                        <PlayerRow key={p.id} player={p} />
                    ))}
                </div>

                <div className={cls.hashRow}>
                    <span className={cls.hashLabel}>Hash:</span>
                    <span className={cls.hashValue}>{HASH}</span>
                    <button type="button" className={cls.hashCopy} onClick={handleCopyHash} aria-label="Копировать хеш">
                        <Image src={CopyIcon} alt="" width={10} height={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import style from './style.module.css';
import Bounty from '@/apis/sukinOs/bounty';
import Button from '@/component/button/layout';
import Nav from '@/component/nav/layout';
import SquareView from './squareView/layout';
import DetailView from './detailView/layout';
import CreateView from './createView/layout';
import MineView from './mineView/layout';
import MyDeliveriesView from './myDeliveriesView/layout';
import TransfersView from './transfersView/layout';
import { createNamespace } from '/utils/js/classcreate.js';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import { selectorUserInfo } from "@/sukinos/store"
import { useSelector } from 'react-redux';
import { getApiData, isApiSuccess } from './utils/response';
const bem = createNamespace('bounty');

 function BountyPlatform() {
  const [view, setView] = useState('square');
  const [detailId, setDetailId] = useState(null);
  const [editBounty, setEditBounty] = useState(null);
  const [pendingTransfers, setPendingTransfers] = useState(0);
   const userInfo = useSelector(selectorUserInfo);
   const  currentUserId = userInfo?.id || 1
  useEffect(() => {
    if (!currentUserId) return;
    const checkTransfers = async () => {
      try {
        const res = await Bounty.bountyTransfersReceived();
        if (!isApiSuccess(res)) {
          setPendingTransfers(0);
          return;
        }
        const list = getApiData(res, []);
        setPendingTransfers(Array.isArray(list) ? list.length : 0);
      } catch (e) {
        setPendingTransfers(0);
      }
    };
    checkTransfers();
    const timer = setInterval(checkTransfers, 60000);
    return () => clearInterval(timer);
  }, [currentUserId]);

  const NAV_ITEMS = [
    { id: 'square', label: '悬赏广场', icon: <EmojiEventsIcon fontSize="small" /> },
    { id: 'mine', label: '我的悬赏', icon: <AssignmentIcon fontSize="small" /> },
    { id: 'my-deliveries', label: '我的交付', icon: <MoveToInboxIcon fontSize="small" /> },
    { id: 'transfers', label: `转让管理${pendingTransfers > 0 ? ` (${pendingTransfers})` : ''}`, icon: <SwapHorizIcon fontSize="small" /> },
  ];

  const handleOpenDetail = (id) => {
    setDetailId(id);
    setView('detail');
  };

  const handleOpenEdit = (b) => {
    setEditBounty(b);
    setView('create');
  };

  const currentTitle = view === 'detail'
    ? '悬赏详情'
    : (NAV_ITEMS.find(i => i.id === view)?.label || '悬赏平台');

  return (
    <div className={style[bem.b()]}>
      <aside className={style[bem.e('sidebar')]}>
        <div className={style[bem.e('brand')]}>
          <div className={style[bem.e('logo')]}>
            <EmojiEventsIcon fontSize="small" />
          </div>
          <div className={style[bem.e('brand-name')]}>
            <strong>Bounty Hub</strong>
            <span>任务流转工作台</span>
          </div>
        </div>
        <Nav
          items={NAV_ITEMS}
          activeId={view}
          onChange={setView}
          theme="light"
          style={{
            width: '100%',
            borderRight: 'none',
            '--su-nav-bg': 'var(--su-fill-color-lighter)',
            '--su-nav-border-color': 'var(--su-border-color-light)',
            '--su-nav-text-color': 'var(--su-text-color-regular)',
            '--su-nav-hover-bg': 'var(--su-fill-color)',
            '--su-nav-hover-text-color': 'var(--su-text-color-primary)',
            '--su-nav-active-bg': 'var(--su-gray-900)',
            '--su-nav-active-text-color': 'var(--su-white)'
          }}
        />
        <div className={style[bem.e('meta')]}>当前用户: {userInfo?.username || '访客'}</div>
      </aside>

      <main className={style[bem.e('main')]}>
        <header className={style[bem.e('header')]}>
          <div className={style[bem.e('header-left')]}>
            <h2>{currentTitle}</h2>
            <div className={style[bem.e('breadcrumb')]}>任务中心 / {currentTitle}</div>
          </div>
          <div className={style[bem.e('header-right')]}>
            <Button
              type="dark"
              size="small"
              icon={<AddIcon />}
              onClick={() => { setEditBounty(null); setView('create'); }}
            >
              发布悬赏
            </Button>
          </div>
        </header>

        <section className={style[bem.e('content')]}>
          <div className={style[bem.e('canvas')]}>
            {view === 'square' && <SquareView onOpenDetail={handleOpenDetail} />}
            {view === 'detail' && <DetailView bountyId={detailId} currentUserId={currentUserId} onBack={() => setView('square')} />}
            {view === 'create' && <CreateView editBounty={editBounty} onDone={() => setView('mine')} onBack={() => setView('square')} />}
            {view === 'mine' && <MineView onOpenDetail={handleOpenDetail} onEdit={handleOpenEdit} />}
            {view === 'my-deliveries' && <MyDeliveriesView onOpenDetail={handleOpenDetail} />}
            {view === 'transfers' && <TransfersView />}
          </div>
        </section>
      </main>
    </div>
  );
}
export default BountyPlatform;

import { createNamespace } from '/utils/js/classcreate.js';
import style from './style.module.css';
import GroupsIcon from '@mui/icons-material/Groups';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const bem = createNamespace('bounty-card');
const CATEGORY_LABELS = { design: '设计', dev: '开发', writing: '写作', other: '其他' };
const STATUS_LABELS = {
  open: '开放中',
  in_progress: '审核中',
  completed: '已完成',
  cancelled: '已取消'
};

function BountyCard({ bounty, onClick }) {
  const fmtMoney = (n) => `¥${Number(n || 0).toFixed(2)}`;

  return (
    <div className={style[bem.b()]} onClick={onClick}>
      <div className={style[bem.e('cover')]}>
        {bounty.images?.[0] ? (
          <img src={bounty.images[0]} alt="" />
        ) : (
          <div className={style[bem.e('placeholder')]}>
            <EmojiEventsIcon sx={{ fontSize: 48 }} />
          </div>
        )}
        <div className={`${style[bem.e('status')]} ${style[bem.em('status', bounty.status)]}`}>
          {STATUS_LABELS[bounty.status] || bounty.status}
        </div>
      </div>
      <div className={style[bem.e('content')]}>
        <h3 className={style[bem.e('title')]}>{bounty.title}</h3>
        <p className={style[bem.e('desc')]}>{bounty.description}</p>
        <div className={style[bem.e('footer')]}>
          <div className={style[bem.e('reward')]}>{fmtMoney(bounty.reward)}</div>
          <div className={style[bem.e('meta')]}>
            <span className={style[bem.e('category')]}>{CATEGORY_LABELS[bounty.category] || '其他'}</span>
            <span className={style[bem.e('deliveries')]}>
              <GroupsIcon fontSize="small" /> {bounty.deliveryCount || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BountyCard;

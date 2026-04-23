import { useState, useEffect } from 'react';
import { createNamespace } from '/utils/js/classcreate.js';
import style from './style.module.css';
import Bounty from '@/apis/sukinOs/bounty';
import Button from '@/component/button/layout';
import { alert } from '@/component/alert/layout';
import { confirm } from '@/component/confirm/layout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import { getApiData, getApiMessage, getErrorMessage, isApiSuccess } from '../utils/response';

const bem = createNamespace('bounty-detail');

function DetailView({ bountyId, currentUserId, onBack }) {
  const [data, setData] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');

  const isOwner = data && currentUserId === data.creatorId;

  const loadData = async () => {
    try {
      const res = await Bounty.bountyDetail({ id: bountyId });
      if (!isApiSuccess(res)) {
        alert.failure(getApiMessage(res, '获取详情失败'));
        setData(null);
        return;
      }
      const info = getApiData(res, null);
      setData(info);
      if (currentUserId === info.creatorId) {
        const dRes = await Bounty.bountyDeliveries({ id: bountyId });
        if (isApiSuccess(dRes)) {
          setDeliveries(getApiData(dRes, []));
        } else {
          setDeliveries([]);
          alert.failure(getApiMessage(dRes, '获取交付列表失败'));
        }
      }
    } catch (e) {
      alert.failure(getErrorMessage(e, '获取详情失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [bountyId]);

  const handleAccept = (did) => {
    confirm.show({
      title: '采纳交付',
      content: '确定要采纳该交付吗？采纳后资金将结算给对方。',
      onConfirm: async () => {
        try {
          const res = await Bounty.bountyDeliveryAccept({ id: bountyId, did });
          if (!isApiSuccess(res)) {
            alert.failure(getApiMessage(res, '操作失败'));
            return;
          }
          alert.success(getApiMessage(res, '操作成功'));
          loadData();
        } catch (e) { alert.failure(getErrorMessage(e, '操作失败')); }
      }
    });
  };

  const handleCancel = () => {
    confirm.show({
      title: '取消悬赏',
      content: '确定要取消这个悬赏吗？资金将退回到您的账户。',
      onConfirm: async () => {
        try {
          const res = await Bounty.bountyCancel({ id: bountyId });
          if (!isApiSuccess(res)) {
            alert.failure(getApiMessage(res, '取消悬赏失败'));
            return;
          }
          alert.success(getApiMessage(res, '悬赏已取消'));
          loadData();
        } catch (e) { alert.failure(getErrorMessage(e, '取消悬赏失败')); }
      }
    });
  };

  const handleSubmit = async () => {
    if (!content.trim()) return alert.warning('请填写交付内容');
    setSubmitting(true);
    try {
      const res = await Bounty.bountyDeliverySubmit({ id: bountyId, payload: { content, attachments: [] } });
      if (!isApiSuccess(res)) {
        alert.failure(getApiMessage(res, '交付提交失败'));
        return;
      }
      alert.success(getApiMessage(res, '提交成功'));
      setShowForm(false);
      setContent('');
      loadData();
    } catch (e) { alert.failure(getErrorMessage(e, '交付提交失败')); } finally { setSubmitting(false); }
  };

  if (loading) return <div className={style[bem.e('loading')]}>加载中...</div>;
  if (!data) return <div className={style[bem.e('error')]}>内容不存在</div>;

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('back')]} onClick={onBack}>
        <ArrowBackIcon fontSize="small" /> 返回列表
      </div>
      <div className={style[bem.e('layout')]}>
        <div className={style[bem.e('main')]}>
          <div className={style[bem.e('header')]}>
            <h1 className={style[bem.e('title')]}>{data.title}</h1>
            <div className={style[bem.e('info')]}>
              <span className={style[bem.e('info-item')]}>
                <AccessTimeIcon fontSize="small" /> {new Date(data.createdAt).toLocaleString()}
              </span>
              <span className={style[bem.e('info-item')]}>
                <PersonIcon fontSize="small" /> 发布者 #{data.creatorId}
              </span>
            </div>
          </div>
          <div className={style[bem.e('desc')]}>{data.description}</div>
          {data.images?.length > 0 && (
            <div className={style[bem.e('gallery')]}>
              {data.images.map((img, i) => <img key={i} src={img} alt="" />)}
            </div>
          )}
          {isOwner ? (
            <div className={style[bem.e('deliveries')]}>
              <h3>收到的交付 ({deliveries.length})</h3>
              {deliveries.length === 0 ? <p className={style[bem.e('empty-text')]}>暂无交付记录</p> : (
                deliveries.map(d => (
                  <div key={d.id} className={style[bem.e('deliv-item')]}>
                    <div className={style[bem.e('deliv-user')]}>提交人: #{d.delivererId}</div>
                    <div className={style[bem.e('deliv-content')]}>{d.content}</div>
                    {d.status === 'pending' && ['open', 'in_progress'].includes(data.status) && (
                      <div className={style[bem.e('deliv-action')]}>
                        <Button type="dark" size="small" onClick={() => handleAccept(d.id)}>采纳交付</Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={style[bem.e('action-area')]}>
              {data.status === 'open' && (
                showForm ? (
                  <div className={style[bem.e('form')]}>
                    <textarea
                      placeholder="描述交付内容..."
                      value={content}
                      onChange={e => setContent(e.target.value)}
                    />
                    <div className={style[bem.e('form-btns')]}>
                      <Button size="small" onClick={() => setShowForm(false)}>取消</Button>
                      <Button type="dark" size="small" loading={submitting} onClick={handleSubmit}>确认提交</Button>
                    </div>
                  </div>
                ) : (
                  <Button type="dark" size="large" icon={<SendIcon />} onClick={() => setShowForm(true)}>我要交付</Button>
                )
              )}
            </div>
          )}
        </div>
        <div className={style[bem.e('side')]}>
          <div className={style[bem.e('reward-card')]}>
            <div className={style[bem.e('reward-label')]}>悬赏金额</div>
            <div className={style[bem.e('reward-val')]}>¥{Number(data.reward).toFixed(2)}</div>
            <div className={style[bem.e('status')]}>状态: {data.status}</div>
          </div>
          {isOwner && data.status === 'open' && (
            <div className={style[bem.e('cancel-wrap')]}>
              <Button type="dark" plain onClick={handleCancel}>取消悬赏</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailView;

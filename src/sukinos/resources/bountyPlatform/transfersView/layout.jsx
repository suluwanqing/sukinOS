import { useState, useEffect } from 'react';
import { createNamespace } from '/utils/js/classcreate.js';
import style from './style.module.css';
import Bounty from '@/apis/sukinOs/bounty';
import Button from '@/component/button/layout';
import { alert } from '@/component/alert/layout';
import { confirm } from '@/component/confirm/layout';
import { getApiData, getApiMessage, getErrorMessage, isApiSuccess } from '../utils/response';

const bem = createNamespace('bounty-transfers');

function TransfersView() {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [tab, setTab] = useState('received');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r1 = await Bounty.bountyTransfersReceived();
      const r2 = await Bounty.bountyTransfersSent();
      if (!isApiSuccess(r1)) {
        setReceived([]);
        alert.failure(getApiMessage(r1, '获取收到的转让失败'));
      } else {
        setReceived(getApiData(r1, []));
      }
      if (!isApiSuccess(r2)) {
        setSent([]);
        alert.failure(getApiMessage(r2, '获取发起的转让失败'));
      } else {
        setSent(getApiData(r2, []));
      }
    } catch (e) {
      alert.failure(getErrorMessage(e, '获取转让数据失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRespond = (tid, accept) => {
    confirm.show({
      title: accept ? '接受转让' : '拒绝转让',
      content: `确定要${accept ? '接受' : '拒绝'}这个转让请求吗？`,
      onConfirm: async () => {
        try {
          const res = await Bounty.bountyTransferRespond({ tid, payload: { accept } });
          if (!isApiSuccess(res)) {
            alert.failure(getApiMessage(res, '操作失败'));
            return;
          }
          alert.success(getApiMessage(res, '操作成功'));
          load();
        } catch (e) { alert.failure(getErrorMessage(e, '操作失败')); }
      }
    });
  };

  const handleCancel = (tid) => {
    confirm.show({
      title: '撤回转让',
      content: '确定要撤回这个转让请求吗？',
      onConfirm: async () => {
        try {
          const res = await Bounty.bountyTransferCancel({ tid });
          if (!isApiSuccess(res)) {
            alert.failure(getApiMessage(res, '撤回失败'));
            return;
          }
          alert.success(getApiMessage(res, '已撤回'));
          load();
        } catch (e) { alert.failure(getErrorMessage(e, '撤回失败')); }
      }
    });
  };

  const list = tab === 'received' ? received : sent;

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('tabs')]}>
        <div
          className={`${style[bem.e('tab')]} ${  bem.is('active', tab === 'received') }`}
          onClick={() => setTab('received')}
        >
          收到的请求 ({received.length})
        </div>
        <div
          className={`${style[bem.e('tab')]} ${ bem.is('active', tab === 'sent') }`}
          onClick={() => setTab('sent')}
        >
          发起的请求 ({sent.length})
        </div>
      </div>

      <div className={style[bem.e('list')]}>
        {loading ? <div className={style[bem.e('empty')]}>加载中...</div> : list.length === 0 ? (
          <div className={style[bem.e('empty')]}>暂无记录</div>
        ) : (
          list.map(t => (
            <div key={t.id} className={style[bem.e('card')]}>
              <div className={style[bem.e('card-info')]}>
                <div className={style[bem.e('card-row')]}><span>悬赏 ID:</span> <strong>#{t.bountyId}</strong></div>
                <div className={style[bem.e('card-row')]}><span>转让金额:</span> <strong className={style[bem.e('price')]}>¥{t.price}</strong></div>
                <div className={style[bem.e('card-row')]}><span>状态:</span> <span>{t.status}</span></div>
                {t.note && <div className={style[bem.e('card-note')]}>{t.note}</div>}
              </div>
              {tab === 'received' && t.status === 'pending' && (
                <div className={style[bem.e('card-btns')]}>
                  <Button type="dark" size="small" onClick={() => handleRespond(t.id, true)}>接受</Button>
                  <Button type="dark" plain size="small" onClick={() => handleRespond(t.id, false)}>拒绝</Button>
                </div>
              )}
              {tab === 'sent' && t.status === 'pending' && (
                <div className={style[bem.e('card-btns')]}>
                  <Button type="dark" plain size="small" onClick={() => handleCancel(t.id)}>撤回请求</Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TransfersView;

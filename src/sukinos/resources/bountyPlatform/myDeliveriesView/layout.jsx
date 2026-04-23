import { useState, useEffect } from 'react';
import { createNamespace } from '/utils/js/classcreate.js';
import style from './style.module.css';
import Bounty from '@/apis/sukinOs/bounty';
import { alert } from '@/component/alert/layout';
import BountyCard from '../components/bountyCard/layout';
import { getApiData, getApiMessage, getErrorMessage, isApiSuccess } from '../utils/response';

const bem = createNamespace('bounty-deliveries');

function MyDeliveriesView({ onOpenDetail }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Bounty.bountyMyDeliveries()
      .then(res => {
        if (!isApiSuccess(res)) {
          setList([]);
          alert.failure(getApiMessage(res, '获取交付记录失败'));
          return;
        }
        const data = getApiData(res, {});
        setList(data?.list || []);
      })
      .catch(e => {
        setList([]);
        alert.failure(getErrorMessage(e, '获取交付记录失败'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className={style[bem.b()]}>
      {loading ? <div className={style[bem.e('loading')]}>加载中...</div> : list.length === 0 ? (
        <div className={style[bem.e('empty')]}>暂无交付记录</div>
      ) : (
        <div className={style[bem.e('grid')]}>
          {list.map(item => (
            <BountyCard key={item.id} bounty={item} onClick={() => onOpenDetail(item.bountyId)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MyDeliveriesView;

import { useState, useEffect } from 'react';
import { createNamespace } from '/utils/js/classcreate.js';
import style from './style.module.css';
import Bounty from '@/apis/sukinOs/bounty';
import Button from '@/component/button/layout';
import { alert } from '@/component/alert/layout';
import BountyCard from '../components/bountyCard/layout';
import { getApiData, getApiMessage, getErrorMessage, isApiSuccess } from '../utils/response';

const bem = createNamespace('bounty-mine');

function MineView({ onOpenDetail, onEdit }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await Bounty.bountyMine();
      if (!isApiSuccess(res)) {
        setList([]);
        alert.failure(getApiMessage(res, '获取我的悬赏失败'));
        return;
      }
      const data = getApiData(res, {});
      setList(data?.list || []);
    } catch (e) {
      setList([]);
      alert.failure(getErrorMessage(e, '获取我的悬赏失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className={style[bem.b()]}>
      {loading ? <div className={style[bem.e('loading')]}>加载中...</div> : list.length === 0 ? (
        <div className={style[bem.e('empty')]}>暂无发布的悬赏</div>
      ) : (
        <div className={style[bem.e('grid')]}>
          {list.map(item => (
            <div key={item.id} className={style[bem.e('item')]}>
              <BountyCard bounty={item} onClick={() => onOpenDetail(item.id)} />
              {item.status === 'open' && (
                <div className={style[bem.e('actions')]}>
                  <Button size="small" onClick={() => onEdit(item)}>编辑</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MineView;

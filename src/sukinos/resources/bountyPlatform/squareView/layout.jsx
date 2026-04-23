import { useState, useEffect, useCallback } from 'react';
import { createNamespace } from '/utils/js/classcreate.js';
import style from './style.module.css';
import Bounty from '@/apis/sukinOs/bounty';
import Button from '@/component/button/layout';
import Select from '@/component/select/drowSelection/layout';
import { alert } from '@/component/alert/layout';
import SearchIcon from '@mui/icons-material/Search';
import BountyCard from '../components/bountyCard/layout';
import { getApiData, getApiMessage, getErrorMessage, isApiSuccess } from '../utils/response';

const bem = createNamespace('bounty-square');
const CATEGORIES = [
  { value: 'all', label: '全部分类' },
  { value: 'design', label: '设计' },
  { value: 'dev', label: '开发' },
  { value: 'writing', label: '写作' },
  { value: 'other', label: '其他' }
];

function SquareView({ onOpenDetail }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ keyword: '', category: 'all' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchList = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = {
        page: p,
        pageSize: 12,
        status: 'open',
        category: filter.category === 'all' ? undefined : filter.category,
        keyword: filter.keyword.trim() || undefined
      };
      const res = await Bounty.bountyList({ params });
      if (!isApiSuccess(res)) {
        alert.failure(getApiMessage(res, '获取悬赏列表失败'));
        setList([]);
        setTotal(0);
        return;
      }
      const data = getApiData(res, {});
      setList(data?.list || []);
      setTotal(data?.total || 0);
      setPage(p);
    } catch (e) {
      alert.failure(getErrorMessage(e, '获取悬赏列表失败'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchList(1);
  }, [filter.category, fetchList]);

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('filter')]}>
        <div className={style[bem.e('search')]}>
          <SearchIcon className={style[bem.e('search-icon')]} />
          <input
            placeholder="搜索悬赏标题..."
            value={filter.keyword}
            onChange={e => setFilter(p => ({ ...p, keyword: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && fetchList(1)}
          />
        </div>
        <div className={style[bem.e('select-wrap')]}>
          <Select
            value={filter.category}
            options={CATEGORIES}
            onChange={value => setFilter(p => ({ ...p, category: value }))}
            placeholder="全部分类"
            showTitle
            boxStyle={{
              height: '36px',
              borderRadius: '6px',
              borderColor: 'var(--su-border-color-light)',
              backgroundColor: 'var(--su-fill-color-lighter)',
              boxShadow: 'none'
            }}
            dropdownStyle={{
              marginTop: '8px',
              borderRadius: '8px',
              border: '1px solid var(--su-border-color-light)',
              boxShadow: '0 14px 28px rgba(var(--su-black-rgb), 0.12)'
            }}
            optionStyle={{
              color: 'var(--su-text-color-regular)',
              backgroundColor: 'var(--su-white)'
            }}
          />
        </div>
        <Button type="dark" size="small" onClick={() => fetchList(1)}>搜索</Button>
      </div>

      {loading ? (
        <div className={style[bem.e('empty')]}>加载中...</div>
      ) : list.length === 0 ? (
        <div className={style[bem.e('empty')]}>暂无悬赏内容</div>
      ) : (
        <div className={style[bem.e('grid')]}>
          {list.map(item => (
            <BountyCard key={item.id} bounty={item} onClick={() => onOpenDetail(item.id)} />
          ))}
        </div>
      )}

      {total > 12 && (
        <div className={style[bem.e('pager')]}>
          <Button size="small" disabled={page <= 1} onClick={() => fetchList(page - 1)}>上一页</Button>
          <span className={style[bem.e('pager-info')]}>{page} / {Math.ceil(total / 12)}</span>
          <Button size="small" disabled={page * 12 >= total} onClick={() => fetchList(page + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}

export default SquareView;

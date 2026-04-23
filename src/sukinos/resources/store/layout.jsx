import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import style from "./style.module.css";
import Recommend from "./recommend/layout";
import Manage from "./manage/layout";
import Update from "./update/layout";
import MyUpLoad from "./myUpLoad/layout";
import Helper from "./helper/layout"
import Setting from "./setting/layout";
import { createNamespace } from '/utils/js/classcreate';
import AppAPI from '@/apis/sukinOs/app.jsx';
import { alert } from "@/component/alert/layout";
import useKernel from "@/sukinos/hooks/useKernel"
import { confirm } from '@/component/Confirm/layout';
import { selectorStoreSettingStorePath } from "@/sukinos/store";

const bem = createNamespace('store');

function Store() {
  const [currentNav, setCurrentNav] = useState('recommend');
  const [remoteApps, setRemoteApps] = useState([]);
  const [updateApps, setUpdateApps] = useState([]);
  const [installedApps, setInstalledApps] = useState([]);
  const [myUploadList, setMyUploadList] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { kernel, startApp, deleteApp } = useKernel();

  const storePath = useSelector(selectorStoreSettingStorePath);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });

  // --- 核心同步逻辑：刷新所有与应用状态相关的列表 ---
  const refreshAll = useCallback(async () => {
    // 同步内核已安装列表 (解构以确保引用更新触发重绘)
    const installed = kernel.getInstalledApps() || [];
    setInstalledApps([...installed]);

    // 检查更新状态
    if (installed.length > 0) {
      const checkList = installed.map(app => ({
        resourceId: app.resourceId,
        localVersion: app.metaInfo?.version || '0'
      }));
      try {
        const res = await AppAPI.checkAppsUpdate({
            installedList: checkList,
            url: storePath.checkUpdatesUrl
        });
        if (res.code === 200) setUpdateApps([...res.data]);
      } catch (e) { console.error("检查更新失败", e); }
    } else {
      setUpdateApps([]);
    }

    // 刷新我的上传列表（同步云端状态）
    try {
      const res = await AppAPI.getMyUploadApps({ url: storePath.myUploadUrl });
      if (res.code === 200) setMyUploadList(res.data || []);
    } catch (e) { console.error("获取上传列表失败", e); }
  }, [kernel, storePath]);

  // 获取商店基础数据
  const fetchShopData = async (page = 1, append = false) => {
    if (loading) return;
    try {
      setLoading(true);
      const res = await AppAPI.getApps({
          current: page,
          pageSize: 20,
          url: storePath.listUrl
      });
      if (res.code === 200) {
        const { items, pagination: pager } = res.data;
        setRemoteApps(prev => append ? [...prev, ...items] : [...items]);
        setPagination({
          currentPage: pager.currentPage,
          totalPages: pager.totalPages,
          totalItems: pager.totalItems
        });
      }
    } finally { setLoading(false); }
  };

  // 搜索逻辑
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);
    // 使用定时器实现防抖
    const delayTimer = setTimeout(async () => {
      try {
        const res = await AppAPI.searchApps({ keyword: searchKeyword, url: storePath.searchUrl });
        if (res.code === 200) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    // 清理函数，若在400ms内 searchKeyword 再次改变，则取消上一次请求
    return () => clearTimeout(delayTimer);
  }, [searchKeyword, storePath.searchUrl]);

  // 处理安装（同样可用于更新，内核底层会判断）
  const handleInstallApp = async (app) => {
    try {
      setLoading(true);
      const res = await AppAPI.downLoadApp({url:app.url});
      await kernel.installApp({worker:res, version:app.version});
      alert.success('操作成功!');
      await refreshAll(); // 刷新所有状态
    } catch (e) {
      alert.failure('安装失败');
    } finally { setLoading(false); }
  }

  // 处理更新（逻辑提升）
  const handleUpdateApp = async (app) => {
    try {
      setLoading(true);
      const res = await AppAPI.downLoadApp({ url: app.url });
      // 调用内核专门的更新方法
      await kernel.updateApp({ worker: res, version: app.version });
      alert.success(`${app.appName} 已更新至 V${app.version}`);
      await refreshAll(); // 刷新所有状态
    } catch (e) {
      console.error('更新失败', e);
      alert.failure('更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除本地应用
  const handleDeleteApp = (id) => {
    confirm.show({
      title: '确认删除',
      content: '您确定要删除该App？删除后将无法恢复。',
      onConfirm: async () => {
        await deleteApp({ resourceId: id });
        alert.success('删除成功');
        await refreshAll();
      }
   });
  }

  // 删除云端记录
  const handleDeleteUpload = async (app) => {
    try {
      const res = await AppAPI.deleteMyUploadApp({
        resourceId: app.resourceId,
        url: storePath.deleteUrl
      });
      if (res.code === 200) {
        alert.success('云端记录已删除');
        await refreshAll();
        return true;
      }
    } catch (e) { alert.failure('删除失败'); }
    return false;
  };

  // 初始化加载
  useEffect(() => {
    fetchShopData(1, false);
    refreshAll();
  }, [storePath, refreshAll]);

  const handleLoadMore = () => {
    if (pagination.currentPage < pagination.totalPages && !loading) {
      fetchShopData(pagination.currentPage + 1, true);
    }
  };

  const renderMainContent = () => {
    // 聚合已安装列表与更新标志
    const managedList = installedApps.map(app => ({
      ...app,
      hasUpdate: !!updateApps.find(u => String(u.resourceId) === String(app.resourceId))
    }));

    switch (currentNav) {
      case 'recommend':
        return (
          <Recommend
            remoteApps={remoteApps}
            installedApps={installedApps}
            updateApps={updateApps}
            onLoadMore={handleLoadMore}
            hasMore={pagination.currentPage < pagination.totalPages}
            isLoading={loading}
            startApp={startApp}
            installApp={handleInstallApp}
            searchResults={searchResults}
            searchKeyword={searchKeyword}
            onKeywordChange={setSearchKeyword} // 状态提升：将更新函数传给子组件
            searchLoading={searchLoading}
          />
        );
      case 'manage':
        return <Manage appList={managedList} startApp={startApp} deleteApp={handleDeleteApp} />;
      case 'update':
        return <Update updateList={updateApps} onRefresh={refreshAll} onUpdate={handleUpdateApp} />;
      case 'myUpload':
        return (
          <MyUpLoad
            onInstall={handleInstallApp}
            myUploadList={myUploadList}
            installedApps={installedApps}
            onDeleteUpload={handleDeleteUpload}
          />
        );
      case 'setting':
        return <Setting />;
      case 'helper':
        return <Helper />
      default:
        return <div className={style[bem.e('empty')]}>未知视图</div>;
    }
  };

  const NAV_ITEMS = [
    { id: 'recommend', title: '商店' },
    { id: 'manage', title: '已安装' },
    { id: 'update', title: '更新' },
    { id: 'myUpload', title: '我的上传' },
    { id: 'setting', title: '设置' },
    { id: 'helper', title: '说明' }
  ];

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('sidebar')]}>
        <div className={style[bem.e('sidebar-header')]}>
          <img src="/logo.jpg" alt="Logo" className={style[bem.e('logo')]} />
          <span className={style[bem.e('title')]}>App Store</span>
        </div>
        <div className={style[bem.e('nav')]}>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={[
                style[bem.e('nav-item')],
                style[bem.is('active', currentNav === item.id)]
              ].filter(Boolean).join(' ')}
              onClick={() => setCurrentNav(item.id)}
            >
              {item.title}
            </div>
          ))}
        </div>
      </div>
      <div className={style[bem.e('content')]}>
        {renderMainContent()}
      </div>
    </div>
  );
}

export default Store;

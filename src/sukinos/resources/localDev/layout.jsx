import React, { useState, useEffect, memo, useRef, useCallback, useMemo } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import kernel from '@/sukinos/utils/process/kernel';
import { alert } from '@/component/alert/layout';
import { useSelector } from 'react-redux';
import { selectorUserInfo, selectorStoreSettingStorePath } from '@/sukinos/store';
import {
  ENV_KEY_NAME, ENV_KEY_IS_BUNDLE, ENV_KEY_CONTENT, ENV_KEY_LOGIC, ENV_KEY_META_INFO,
  appCustom, appCustomMapper, appTypes, DEFAULT_LOGIC, LOCAL_DEV_SYMPLE_LINKS
} from '@/sukinos/utils/config';

import RenderProcess from '@/sukinos/utils/process/renderProcess';
import Select from "@/component/select/drowSelection/layout";
import Input from "@/component/input/layout";
import { confirm } from '@/component/confirm/layout';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import TerminalIcon from '@mui/icons-material/Terminal';
import HttpIcon from '@mui/icons-material/Http';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import BoltIcon from '@mui/icons-material/Bolt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DownloadIcon from '@mui/icons-material/Download';

const bem = createNamespace('local-dev');

const STORAGE_KEY = 'sukin_local_dev_config';

const DEFAULT_CONFIG = {
  syncMode: 'http',
  host: 'localhost',
  port: 5173,
  dir: 'src',
  watchDebounce: 500,
  fetchDebounce: 300,
  pollInterval: 2000,
  autoSync: false,
  useHttps: true,
  folderAutoSync: false,
  folderPollInterval: 2000,
  sseBaseUrl: 'https://sukin.top',
  sseEndpoint: '/api/sukinos/localdev/sse',
  sseTokenEndpoint: '/api/sukinos/localdev/sse/token',
  sseHealthEndpoint: '/api/sukinos/localdev/health',
  authType: 'cookie',
  authToken: '',
  enableHealthCheck: false,
  healthCheckInterval: 30000
};

const loadSaved = () => {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return { ...DEFAULT_CONFIG }; }
};

const DEFAULT_APP_META = {
  sysOptions: { shouldUpload: false, uploadInfo: { isPrivate: false } },
  appName: '', appIcon: '/logo.jpg',
  initialSize: { w: 600, h: 450, x: 0, y: 0 },
  appType: appTypes?.[0]?.value || 'editor',
  exposeState: false, saveState: false,
  description: '这是一个App', syncLocal: false,
  custom: { ...appCustom },
};

const STATUS_CFG = {
  idle:    { label: 'OFFLINE', mod: '' },
  syncing: { label: 'SYNC',    mod: 'syncing' },
  ok:      { label: 'LIVE',    mod: 'ok' },
  error:   { label: 'ERROR',   mod: 'error' },
  paused:  { label: 'PAUSED',  mod: 'paused' },
};

const Toggle = ({ checked, onChange, label }) => (
  <label className={style[bem.e('toggle-wrap')]}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={[style[bem.e('toggle')], checked ? style[bem.e('toggle--on')] : ''].join(' ')}
      onClick={() => onChange({ target: { checked: !checked } })}
    >
      <span className={style[bem.e('toggle-knob')]} />
    </button>
    {label && <span className={style[bem.e('toggle-label')]}>{label}</span>}
  </label>
);

const Field = ({ label, dirty, children, span }) => (
  <div className={[style[bem.e('field')], span ? style[bem.e('field--span')] : ''].join(' ')}>
    <div className={style[bem.e('field-label')]}>
      {label}
      {dirty && <span className={style[bem.e('dirty')]} />}
    </div>
    {children}
  </div>
);

const Cap = ({ children }) => (
  <div className={style[bem.e('cap')]}>{children}</div>
);

const Divider = () => <div className={style[bem.e('divider')]} />;

const ConnectPanel = ({ draft, config, setCfg, folderName, handleSelectFolder, userInfo }) => (
  <div className={style[bem.e('panel-body')]}>
    <Cap>同步模式</Cap>
    <div className={style[bem.e('grid')]}>
      <Field label="模式" dirty={draft.syncMode !== config.syncMode} span>
        <Select
          value={draft.syncMode}
          options={[
            {label: 'HTTP服务', value: 'http'},
            {label: '本地文件夹', value: 'folder'},
            {label: 'SSE推送+文件夹', value: 'sse_folder'}
          ]}
          onChange={val => setCfg('syncMode', val)}
          boxStyle={{ height: '30px', backgroundColor: 'transparent', fontSize: '12px', border: '1px solid #e0e0e0', borderRadius: '0' }}
        />
      </Field>
    </div>
    <Divider />

    {draft.syncMode === 'http' && (
      <>
        <Cap>连接配置 (HTTP)</Cap>
        <div className={style[bem.e('grid')]}>
          <Field label="主机/域名" dirty={draft.host !== config.host} span>
            <Input value={draft.host} onChange={e => setCfg('host', e.target.value.trim())} placeholder="localhost 或 local.example.com" size="medium" />
          </Field>
          <Field label="端口" dirty={draft.port !== config.port}>
            <Input type="number" value={draft.port} onChange={e => setCfg('port', Number(e.target.value))} placeholder="5173" size="medium" />
          </Field>
          <Field label="工作目录" dirty={draft.dir !== config.dir}>
            <Input value={draft.dir} onChange={e => setCfg('dir', e.target.value.trim())} placeholder="src" size="medium" />
          </Field>
          <Field label="使用 HTTPS" dirty={draft.useHttps !== config.useHttps} span>
            <Toggle checked={draft.useHttps} onChange={() => setCfg('useHttps', !draft.useHttps)} label={draft.useHttps ? '已开启' : '已关闭'} />
          </Field>
        </div>
        <Divider />
        <Cap>时间与同步策略</Cap>
        <div className={style[bem.e('grid')]}>
          <Field label="自动轮询同步" dirty={draft.autoSync !== config.autoSync} span>
            <Toggle checked={draft.autoSync} onChange={() => setCfg('autoSync', !draft.autoSync)} label={draft.autoSync ? '已启用' : '已禁用'} />
          </Field>
          <Field label="轮询间隔 ms" dirty={draft.pollInterval !== config.pollInterval}>
            <Input type="number" value={draft.pollInterval} disabled={!draft.autoSync} onChange={e => setCfg('pollInterval', parseInt(e.target.value, 10) || 100)} size="small" />
          </Field>
          <Field label="远端监听防抖 ms" dirty={draft.watchDebounce !== config.watchDebounce}>
            <Input type="number" value={draft.watchDebounce} onChange={e => setCfg('watchDebounce', parseInt(e.target.value, 10) || 0)} size="small" />
          </Field>
          <Field label="前端执行防抖 ms" dirty={draft.fetchDebounce !== config.fetchDebounce}>
            <Input type="number" value={draft.fetchDebounce} onChange={e => setCfg('fetchDebounce', parseInt(e.target.value, 10) || 0)} size="small" />
          </Field>
        </div>
      </>
    )}

    {draft.syncMode === 'folder' && (
      <>
        <Cap>连接配置 (本地文件夹)</Cap>
        <div className={style[bem.e('grid')]}>
          <Field label="选择目录" span>
            <button onClick={handleSelectFolder} className={style[bem.e('mode-btn')]} style={{width: '100%', height: '30px', textAlign: 'left', padding: '0 8px'}}>
              {folderName ? `已选择: ${folderName}` : '点击选择文件夹'}
            </button>
          </Field>
        </div>
        <Divider />
        <Cap>时间与同步策略</Cap>
        <div className={style[bem.e('grid')]}>
          <Field label="自动轮询同步" dirty={draft.folderAutoSync !== config.folderAutoSync} span>
            <Toggle checked={draft.folderAutoSync} onChange={() => setCfg('folderAutoSync', !draft.folderAutoSync)} label={draft.folderAutoSync ? '已启用' : '已禁用'} />
          </Field>
          <Field label="轮询间隔 ms" dirty={draft.folderPollInterval !== config.folderPollInterval}>
            <Input type="number" value={draft.folderPollInterval} disabled={!draft.folderAutoSync} onChange={e => setCfg('folderPollInterval', parseInt(e.target.value, 10) || 100)} size="small" />
          </Field>
          <Field label="前端执行防抖 ms" dirty={draft.fetchDebounce !== config.fetchDebounce}>
            <Input type="number" value={draft.fetchDebounce} onChange={e => setCfg('fetchDebounce', parseInt(e.target.value, 10) || 0)} size="small" />
          </Field>
        </div>
      </>
    )}

    {draft.syncMode === 'sse_folder' && (
      <>
        <Cap>连接配置 (SSE 推送 + 文件夹)</Cap>
        <div className={style[bem.e('grid')]}>
          <Field label="我的 User ID (用于配置Vite)" span>
            <Input value={userInfo?.id || '未获取到用户信息'} readOnly size="medium" />
          </Field>
          <Field label="SSE 服务基础 URL" dirty={draft.sseBaseUrl !== config.sseBaseUrl} span>
            <Input
              value={draft.sseBaseUrl}
              onChange={e => setCfg('sseBaseUrl', e.target.value.trim())}
              placeholder="https://your-server.com 或 http://localhost:8000"
              size="medium"
            />
          </Field>
          <Field label="SSE 端点路径" dirty={draft.sseEndpoint !== config.sseEndpoint} span>
            <Input
              value={draft.sseEndpoint}
              onChange={e => setCfg('sseEndpoint', e.target.value.trim())}
              placeholder="/api/sukinos/localdev/sse"
              size="medium"
            />
          </Field>
          <Field label="Token 获取端点" dirty={draft.sseTokenEndpoint !== config.sseTokenEndpoint} span>
            <Input
              value={draft.sseTokenEndpoint}
              onChange={e => setCfg('sseTokenEndpoint', e.target.value.trim())}
              placeholder="/api/sukinos/localdev/sse/token"
              size="medium"
            />
          </Field>
          <Field label="选择对应本地目录" span>
            <button onClick={handleSelectFolder} className={style[bem.e('mode-btn')]} style={{width: '100%', height: '30px', textAlign: 'left', padding: '0 8px'}}>
              {folderName ? `已选择: ${folderName}` : '点击选择文件夹'}
            </button>
          </Field>
        </div>
        <Divider />
        <Cap>认证配置</Cap>
        <div className={style[bem.e('grid')]}>
          <Field label="认证方式" dirty={draft.authType !== config.authType} span>
            <Select
              value={draft.authType}
              options={[
                {label: '无认证', value: 'none'},
                {label: 'Cookie 认证', value: 'cookie'},
                {label: 'Bearer Token', value: 'bearer'}
              ]}
              onChange={val => setCfg('authType', val)}
              boxStyle={{ height: '30px', backgroundColor: 'transparent', fontSize: '12px', border: '1px solid #e0e0e0', borderRadius: '0' }}
            />
          </Field>
          {draft.authType === 'bearer' && (
            <Field label="Bearer Token" dirty={draft.authToken !== config.authToken} span>
              <Input
                type="password"
                value={draft.authToken}
                onChange={e => setCfg('authToken', e.target.value.trim())}
                placeholder="输入你的 Bearer Token"
                size="medium"
              />
            </Field>
          )}
        </div>
        <Divider />
        <Cap>健康检查 (可选)</Cap>
        <div className={style[bem.e('grid')]}>
          <Field label="启用健康检查" dirty={draft.enableHealthCheck !== config.enableHealthCheck} span>
            <Toggle checked={draft.enableHealthCheck} onChange={() => setCfg('enableHealthCheck', !draft.enableHealthCheck)} label={draft.enableHealthCheck ? '已启用' : '已禁用'} />
          </Field>
          {draft.enableHealthCheck && (
            <>
              <Field label="健康检查端点" dirty={draft.sseHealthEndpoint !== config.sseHealthEndpoint} span>
                <Input
                  value={draft.sseHealthEndpoint}
                  onChange={e => setCfg('sseHealthEndpoint', e.target.value.trim())}
                  placeholder="/api/sukinos/localdev/health"
                  size="medium"
                />
              </Field>
              <Field label="检查间隔 ms" dirty={draft.healthCheckInterval !== config.healthCheckInterval}>
                <Input
                  type="number"
                  value={draft.healthCheckInterval}
                  onChange={e => setCfg('healthCheckInterval', parseInt(e.target.value, 10) || 30000)}
                  size="small"
                />
              </Field>
            </>
          )}
        </div>
        <Divider />
        <Cap>时间与同步策略</Cap>
        <div className={style[bem.e('grid')]}>
          <Field label="开启远端推送接收" dirty={draft.autoSync !== config.autoSync} span>
            <Toggle checked={draft.autoSync} onChange={() => setCfg('autoSync', !draft.autoSync)} label={draft.autoSync ? '已监听' : '未监听'} />
          </Field>
          <Field label="前端接收防抖 ms" dirty={draft.fetchDebounce !== config.fetchDebounce}>
            <Input type="number" value={draft.fetchDebounce} onChange={e => setCfg('fetchDebounce', parseInt(e.target.value, 10) || 0)} size="small" />
          </Field>
        </div>
      </>
    )}
  </div>
);

const AppPanel = ({ appMeta, updateAppMeta, isManualType, setIsManualType }) => (
  <div className={style[bem.e('panel-body')]}>
    <Cap>基础信息</Cap>
    <div className={style[bem.e('grid')]}>
      <Field label="应用名称">
        <Input value={appMeta.appName} onChange={e => updateAppMeta({ appName: e.target.value })} placeholder="MyApp" size="medium" />
      </Field>
      <Field label="图标路径">
        <Input value={appMeta.appIcon} onChange={e => updateAppMeta({ appIcon: e.target.value })} placeholder="/logo.jpg" size="medium" />
      </Field>
      <Field label="简短描述" span>
        <Input value={appMeta.description} onChange={e => updateAppMeta({ description: e.target.value })} placeholder="描述信息" size="medium" />
      </Field>
    </div>
    <Divider />
    <Cap>分类与视窗</Cap>
    <div className={style[bem.e('grid')]}>
      <Field label="应用类型" span>
        <div className={style[bem.e('type-row')]}>
          <button className={style[bem.e('mode-btn')]} onClick={() => setIsManualType(!isManualType)}>
            {isManualType ? '选预设' : '自定义'}
          </button>
          {isManualType
            ? <Input value={appMeta.appType} onChange={e => updateAppMeta({ appType: e.target.value })} placeholder="自定义类型" size="small" />
            : <Select
                value={appMeta.appType}
                options={appTypes}
                onChange={val => updateAppMeta({ appType: val })}
                placeholder="选择类型"
                boxStyle={{ height: '30px', backgroundColor: 'transparent', fontSize: '12px', border: '1px solid #e0e0e0', borderRadius: '0' }}
              />
          }
        </div>
      </Field>
      <Field label="宽度 W">
        <Input type="number" value={appMeta.initialSize?.w} onChange={e => updateAppMeta({ initialSize: { ...appMeta.initialSize, w: Number(e.target.value) } })} size="small" />
      </Field>
      <Field label="高度 H">
        <Input type="number" value={appMeta.initialSize?.h} onChange={e => updateAppMeta({ initialSize: { ...appMeta.initialSize, h: Number(e.target.value) } })} size="small" />
      </Field>
    </div>
    <Divider />
    <Cap>运行选项</Cap>
    <div className={style[bem.e('flag-grid')]}>
      <Toggle label="暴露状态" checked={!!appMeta.exposeState} onChange={e => updateAppMeta({ exposeState: e.target.checked })} />
      <Toggle label="状态持久化" checked={!!appMeta.saveState} onChange={e => updateAppMeta({ saveState: e.target.checked })} />
      <Toggle label="云端上传" checked={!!appMeta.sysOptions?.shouldUpload} onChange={e => updateAppMeta({ sysOptions: { ...appMeta.sysOptions, shouldUpload: e.target.checked } })} />
      <Toggle label="应用私有" checked={!!appMeta.sysOptions?.uploadInfo?.isPrivate} onChange={e => updateAppMeta({ sysOptions: { ...appMeta.sysOptions, uploadInfo: { ...appMeta.sysOptions?.uploadInfo, isPrivate: e.target.checked } } })} />
    </div>
    {appCustomMapper && Object.keys(appCustomMapper).length > 0 && (
      <>
        <Divider />
        <Cap>扩展标志</Cap>
        <div className={style[bem.e('flag-grid')]}>
          {Object.entries(appMeta.custom).map(([key, value]) => (
            <Toggle
              key={key}
              label={appCustomMapper[key] || key}
              checked={!!value}
              onChange={() => updateAppMeta({ custom: { ...appMeta.custom, [key]: !value } })}
            />
          ))}
        </div>
      </>
    )}
  </div>
);

const FilesPanel = ({ fetchStatus, lastSync, errorMsg, missingRequired, compileErr, fileList, hasLogic, compiling, handleManualSync, handleCreate, appMeta, syncPaused, onTogglePause }) => {
  const { mod } = STATUS_CFG[fetchStatus];
  const canPublish = missingRequired.length === 0 && !!appMeta.appName && fetchStatus === 'ok';
  return (
    <div className={style[bem.e('panel-body')]}>
      <div className={style[bem.e('status-header')]}>
        <Cap>同步状态</Cap>
        <span className={[style[bem.e('pill')], mod ? style[bem.e(`pill--${mod}`)] : ''].join(' ')}>
          {STATUS_CFG[fetchStatus].label}
        </span>
      </div>
      <div className={style[bem.e('sync-ts')]}>
        {lastSync ? `上次 ${lastSync.toLocaleTimeString()}` : '尚未同步'}
        {errorMsg && <span className={style[bem.e('sync-err')]}> · {errorMsg}</span>}
      </div>
      {missingRequired.length > 0 && fetchStatus === 'ok' && (
        <div className={style[bem.e('alert')]}>
          <b>!</b> 缺少：{missingRequired.join('、')}
        </div>
      )}
      {compileErr && (
        <div className={[style[bem.e('alert')], style[bem.e('alert--err')]].join(' ')}>
          <b>✕</b> {compileErr}
        </div>
      )}
      {(fileList.length > 0 || hasLogic) && (
        <>
          <Divider />
          <Cap>文件列表</Cap>
          <div className={style[bem.e('file-tree')]}>
            {fileList.map(f => (
              <div key={f} className={style[bem.e('file-row')]}>
                <span className={style[bem.e('file-ext')]}>{f.split('.').pop()}</span>
                <span className={style[bem.e('file-name')]}>{f}</span>
                <span className={style[bem.e('file-type')]}>VIEW</span>
              </div>
            ))}
            {hasLogic && (
              <div className={[style[bem.e('file-row')], style[bem.e('file-row--logic')]].join(' ')}>
                <span className={style[bem.e('file-ext')]}>js</span>
                <span className={style[bem.e('file-name')]}>Logic.jsx</span>
                <span className={style[bem.e('file-type')]}>LOGIC</span>
              </div>
            )}
          </div>
        </>
      )}
      <Divider />
      <div className={style[bem.e('panel-actions')]}>
        <button
          className={[style[bem.e('btn-ghost')], syncPaused ? style[bem.e('btn-ghost--paused')] : ''].join(' ')}
          onClick={onTogglePause}
          title={syncPaused ? '恢复自动同步' : '立即暂停同步'}
        >
          {syncPaused ? <PlayArrowIcon sx={{fontSize: 16}} /> : <PauseIcon sx={{fontSize: 16}}/>}
          {syncPaused ? '恢复' : '暂停'}
        </button>
        <button className={style[bem.e('btn-ghost')]} onClick={handleManualSync} disabled={fetchStatus === 'syncing'}>
          {compiling ? '编译中…' : fetchStatus === 'syncing' ? '同步中…' : '立即同步'}
        </button>
        <button className={style[bem.e('btn-solid')]} onClick={handleCreate} disabled={!canPublish}>
          发布应用
        </button>
      </div>
    </div>
  );
};

const DebugPanel = ({ previewState, dispatchLogs }) => (
  <div className={style[bem.e('panel-body')]}>
    <Cap>运行状态</Cap>
    <div className={style[bem.e('debug-pane')]}>
      <pre className={style[bem.e('debug-pre')]}>{JSON.stringify(previewState, null, 2)}</pre>
    </div>
    <Divider />
    <Cap>Dispatch 日志</Cap>
    <div className={style[bem.e('debug-pane')]}>
      {dispatchLogs.length === 0
        ? <span className={style[bem.e('debug-empty')]}>等待 Action…</span>
        : dispatchLogs.map((log, i) => (
          <div key={i} className={style[bem.e('log-row')]}>
            <span className={style[bem.e('log-ts')]}>{log.t}</span>
            <span className={style[bem.e('log-payload')]}>{JSON.stringify(log.a)}</span>
          </div>
        ))
      }
    </div>
  </div>
);

const GuidePanel = () => {
  const download = async (type) => {
    const url = LOCAL_DEV_SYMPLE_LINKS[type];
    if (!url) {
      console.error(`未找到类型为"${type}"的下载链接`);
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = url.split('/').pop() || 'download';

      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      }

      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('下载错误:', error);
      confirm.show({
        title: '模板下载',
        content: '将会下载模板文件!',
        onConfirm: () => {
          window.open(url, '_blank');
        }
      })
    }
  };

  const guideSteps = [
    {
      number: '01',
      title: '获取模板代码',
      description: '点击底部"资源模板下载"下载 Vite 插件或服务模板。解压并在本地运行 npm install。',
      code: 'npm install'
    },
    {
      number: '02',
      title: '准备核心文件',
      description: '确保你的源码目录（如 src/）包含以下核心文件：',
      files: [
        { name: 'layout.jsx', description: '应用的视图入口组件' },
        { name: 'Logic.jsx', description: '处理 Reducer 与状态逻辑的入口' }
      ]
    },
    {
      number: '03',
      title: '配置并启动同步',
      description: '在"连接"面板根据你的开发习惯选择以下三种模式之一。'
    }
  ];

  const syncModes = [
    {
      id: 'http',
      icon: <HttpIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />,
      title: '模式 A：HTTP 服务',
      principle: '前端定时轮询请求本地 Node.js 服务器暴露的同步接口。',
      steps: [
        '在本地项目运行 npm run dev (默认端口 5173)。',
        '确保本地 vite.config.js 中已配置了对应的 Sukin 同步插件。',
        '在此面板配置 localhost 与端口，开启[自动轮询]。'
      ],
      tip: '适合需要手动配置本地https/证书'
    },
    {
      id: 'local',
      icon: <FolderOpenIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />,
      title: '模式 B：本地文件夹 (零配置)',
      principle: '利用浏览器 API 直接读取你硬盘上的文件夹内容，性能最佳且无需启动 Node 服务。',
      steps: [
        '在连接配置中切换到"本地文件夹"。',
        '点击[选择目录]按钮，并在系统弹窗中授权浏览器读取你的源码目录。',
        '开启[自动轮询同步]，系统会定时检查文件系统变更。'
      ],
      tip: '适合直接使用'
    },
    {
      id: 'sse',
      icon: <BoltIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />,
      title: '模式 C：SSE 推送 + 文件夹',
      principle: '本地插件通过 SSE 实时告知前端"文件已改"，前端再精准读取文件夹。零延迟，低能耗。',
      steps: [
        '将面板显示的[User ID]填入本地项目的插件配置中。',
        '将指定的sse消息trgger 填入 本地项目的插件配置中',
        '在此面板完成与本地插件对应的目录[选择对应本地目录]。',
        '开启监听，当你点击 IDE 的"保存"时，应用视窗将立即重绘。'
      ],
      tip: '增加体验'
    }
  ];

  const downloadTemplates = [
    {
      id: 'standard',
      icon: <FolderZipIcon sx={{ mr: 1, fontSize: 18 }} />,
      label: 'Vite 插件模板',
      description: '包含完整的 Vite 插件配置 and 示例代码'
    },
    {
      id: 'logic',
      icon: <TerminalIcon sx={{ mr: 1, fontSize: 18 }} />,
      label: 'SSE服务模板[服务已经提供sse接口]',
      description: '适合SSE + 文件夹模式'
    }
  ];

  return (
    <div className={style[bem.e('panel-body')]}>
      <section className={style[bem.e('section')]}>
        <Cap>
          <HelpOutlineIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
          快速上手流程
        </Cap>
        <div className={style[bem.e('guide-steps')]}>
          {guideSteps.map((step, index) => (
            <div key={index} className={style[bem.e('step')]}>
              <span className={style[bem.e('step-num')]}>{step.number}</span>
              <div className={style[bem.e('step-content')]}>
                <div className={style[bem.e('step-title')]}>{step.title}</div>
                <div className={style[bem.e('step-desc')]}>
                  {step.description}
                  {step.files && (
                    <ul className={style[bem.e('file-list')]}>
                      {step.files.map((file, idx) => (
                        <li key={idx}>
                          <code>{file.name}</code>: {file.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Divider />
      {syncModes.map((mode, index) => (
        <section key={mode.id} className={style[bem.e('section')]}>
          <Cap>
            {mode.icon}
            {mode.title}
            {mode.tip && <span className={style[bem.e('mode-tip')]}>({mode.tip})</span>}
          </Cap>
          <div className={style[bem.e('guide-info')]}>
            <div className={style[bem.e('principle')]}><b>原理：</b>{mode.principle}</div>
            <div className={style[bem.e('principle')]}><b>配置步骤：</b></div>
            <ol className={style[bem.e('step-list')]}>
              {mode.steps.map((step, stepIndex) => (
                <li key={stepIndex}>
                  {step.includes('npm run dev') ? (
                    <>在本地项目运行 <code>npm run dev</code> (默认端口 5173)。</>
                  ) : step.includes('vite.config.js') ? (
                    <>确保本地 <code>vite.config.js</code> 中已配置了对应的 Sukin 同步插件。</>
                  ) : step}
                </li>
              ))}
            </ol>
          </div>
          {index < syncModes.length - 1 && <Divider />}
        </section>
      ))}
      <Divider />
      <section className={style[bem.e('section')]}>
        <Cap>
          <DownloadIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
          资源模板下载
        </Cap>
        <div className={style[bem.e('guide-actions')]}>
          {downloadTemplates.map((template) => (
            <div key={template.id} className={style[bem.e('dl-item')]}>
              <button className={style[bem.e('btn-dl')]} onClick={() => download(template.id)} title={template.description}>
                {template.icon}
                <div className={style[bem.e('dl-content')]}>
                  <span className={style[bem.e('dl-text')]}>{template.label}</span>
                  {template.description && <span className={style[bem.e('dl-desc')]}>{template.description}</span>}
                </div>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const NAV_ITEMS = [
  { id: 'connect', label: '连接', svg: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 12h4m0 0l-2-2m2 2l-2 2M14 7.5l2.5 3M14 16.5l2.5-3"/></svg> },
  { id: 'app', label: '配置', svg: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { id: 'status', label: '状态', svg: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg> },
  { id: 'debug', label: '日志', svg: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
  { id: 'guide', label: '指南', svg: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> },
];

const PANEL_TITLES = { connect: '连接配置', app: '应用配置', status: '文件同步', debug: '调试器', guide: '使用指南' };

const LocalDev = () => {
  const userInfo = useSelector(selectorUserInfo);
  const storePath = useSelector(selectorStoreSettingStorePath);
  const [config, setConfig] = useState(loadSaved);
  const [draft, setDraft] = useState(loadSaved);
  const [fetchStatus, setFetchStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [hasLogic, setHasLogic] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [missingRequired, setMissingRequired] = useState([]);
  const [localFiles, setLocalFiles] = useState({});
  const [localLogicCode, setLocalLogicCode] = useState(DEFAULT_LOGIC);
  const [appMeta, setAppMeta] = useState(DEFAULT_APP_META);
  const [previewState, setPreviewState] = useState({});
  const [compiling, setCompiling] = useState(false);
  const [compileErr, setCompileErr] = useState('');
  const [activeNav, setActiveNav] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [syncPaused, setSyncPaused] = useState(false);
  const [isManualType, setIsManualType] = useState(false);
  const [dispatchLogs, setDispatchLogs] = useState([]);

  const configRef = useRef(config);
  const lastVRef = useRef(null);
  const pollRef = useRef(null);
  const fetchDbRef = useRef(null);
  const drawerRef = useRef(null);
  const folderHandleRef = useRef(null);
  const healthCheckRef = useRef(null);
  const isResumingRef = useRef(false);

  // 使用 useMemo 监听项目特征（文件夹、连接配置）。
  // 这样在同项目内修改代码热更新时，PID 保持不变，完美保留内部状态（如 Redux store 和表单输入）。
  // 一旦切换了本地文件夹或远程连接目标，立即生成新 PID 彻底重置沙箱引擎与 CSS，杜绝污染与样式残留。
  const previewId = useMemo(() => {
    return `ldv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }, [folderName, config.syncMode, config.host, config.port, config.dir]);

  useEffect(() => { configRef.current = config; }, [config]);

  const updateAppMeta = useCallback((updates) => setAppMeta(prev => ({ ...prev, ...updates })), []);

  const handleTogglePause = useCallback(() => {
    setSyncPaused(prev => {
      const next = !prev;
      if (!next) {
        isResumingRef.current = true;
        setTimeout(() => { performSync(configRef.current, false); isResumingRef.current = false; }, 100);
      } else {
        setFetchStatus('paused');
      }
      return next;
    });
  }, []);

  const getRequestHeaders = useCallback(() => {
    const headers = {};
    if (config.authType === 'bearer' && config.authToken) headers['Authorization'] = `Bearer ${config.authToken}`;
    return headers;
  }, [config.authType, config.authToken]);

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...getRequestHeaders(), ...options.headers };
    const credentialsMode = (config.syncMode === 'http' || config.authType === 'none') ? 'omit' : (config.authType === 'cookie' ? 'include' : 'omit');
    return fetch(url, { ...options, headers, credentials: credentialsMode });
  }, [getRequestHeaders, config.authType, config.syncMode]);

  const getSSEToken = useCallback(async () => {
    try {
      const baseUrl = config.sseBaseUrl.replace(/\/$/, '');
      const response = await fetchWithAuth(`${baseUrl}${config.sseTokenEndpoint}`, { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        if (result.code === 200 && result.data?.sseToken) return result.data.sseToken;
      }
      alert.failure('SSE TOKEN获取失败');
      return null;
    } catch (error) { alert.failure("SSE TOKEN获取异常"); return null; }
  }, [config.sseBaseUrl, config.sseTokenEndpoint, fetchWithAuth]);

  const performHealthCheck = useCallback(async () => {
    if (!config.enableHealthCheck) return;
    try {
      const baseUrl = config.sseBaseUrl.replace(/\/$/, '');
      await fetchWithAuth(`${baseUrl}${config.sseHealthEndpoint}`, { method: 'GET' });
    } catch (error) { alert.failure("健康检查失败!"); }
  }, [config.sseBaseUrl, config.sseHealthEndpoint, config.enableHealthCheck, fetchWithAuth]);

  useEffect(() => {
    if (config.syncMode === 'sse_folder' && config.enableHealthCheck && config.autoSync && !syncPaused) {
      performHealthCheck();
      healthCheckRef.current = setInterval(performHealthCheck, config.healthCheckInterval);
    }
    return () => { if (healthCheckRef.current) clearInterval(healthCheckRef.current); };
  }, [config.syncMode, config.enableHealthCheck, config.autoSync, config.healthCheckInterval, performHealthCheck, syncPaused]);

  const performSync = useCallback(async (cfg, versionCheck = false) => {
    if (isResumingRef.current && versionCheck) return;
    if (cfg.syncMode === 'folder' || cfg.syncMode === 'sse_folder') {
      if (!folderHandleRef.current) { if (!versionCheck) { setErrorMsg('未选择文件夹'); setFetchStatus('error'); } return; }
      try {
        if (!versionCheck) setFetchStatus('syncing');
        const files = {}; let logic = '';
        for await (const entry of folderHandleRef.current.values()) {
          if (entry.kind === 'file' && entry.name.match(/\.(jsx|js)$/)) {
            const f = await entry.getFile(); const text = await f.text();
            if (entry.name.toLowerCase().startsWith('logic.')) logic = text; else files[entry.name] = text;
          }
        }
        const currentV = Object.values(files).reduce((acc, curr) => acc + curr.length, 0) + logic.length;
        if (versionCheck && currentV === lastVRef.current) return;
        lastVRef.current = currentV;
        const keys = Object.keys(files); const missing = [];
        if (!keys.some(k => /^layout\.(jsx|js)$/i.test(k))) missing.push('layout.jsx');
        if (!logic) missing.push('logic.jsx');
        setMissingRequired(missing); setLocalFiles(files); setLocalLogicCode(logic || DEFAULT_LOGIC);
        setFileList(keys); setHasLogic(!!logic); setLastSync(new Date()); setFetchStatus('ok'); setErrorMsg('');
      } catch (e) { setErrorMsg(e.message); setFetchStatus('error'); }
    } else {
      try {
        if (!versionCheck) setFetchStatus('syncing');
        const params = new URLSearchParams({ dir: cfg.dir, watchDebounce: cfg.watchDebounce });
        const protocol = cfg.useHttps ? 'https' : 'http';
        const credentialsMode = (cfg.syncMode === 'http' || cfg.authType === 'none') ? 'omit' : (cfg.authType === 'cookie' ? 'include' : 'omit');
        const res = await fetch(`${protocol}://${cfg.host}:${cfg.port}/__sukin_local_sync?${params}`, { credentials: credentialsMode });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.status !== 'ok') throw new Error(data.message || '服务端异常');
        if (versionCheck && data.v === lastVRef.current) return;
        lastVRef.current = data.v;
        const viewFiles = data.files || {}; const logicCode = data.logic || '';
        const keys = Object.keys(viewFiles); const missing = [];
        if (!keys.some(k => /^layout\.(jsx|js)$/i.test(k))) missing.push('layout.jsx');
        if (!logicCode) missing.push('logic.jsx');
        setMissingRequired(missing); setLocalFiles(viewFiles); setLocalLogicCode(logicCode || DEFAULT_LOGIC);
        setFileList(keys); setHasLogic(!!logicCode); setLastSync(new Date()); setFetchStatus('ok'); setErrorMsg('');
      } catch (e) { setErrorMsg(e.message); setFetchStatus('error'); }
    }
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (syncPaused) return;
    if (config.syncMode === 'http' && config.autoSync) pollRef.current = setInterval(() => performSync(configRef.current, true), config.pollInterval);
    else if (config.syncMode === 'folder' && config.folderAutoSync) pollRef.current = setInterval(() => performSync(configRef.current, true), config.folderPollInterval);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [config.syncMode, config.autoSync, config.pollInterval, config.folderAutoSync, config.folderPollInterval, performSync, syncPaused]);

  useEffect(() => {
    let es = null; let reconnectTimer = null; let reconnectAttempts = 0;
    if (syncPaused) { alert.success("服务已暂停!"); return; }
    const setupSSE = async () => {
      if (config.syncMode !== 'sse_folder' || !config.autoSync || !userInfo?.id) return;
      try {
        let sseToken = config.authType !== 'none' ? await getSSEToken() : '';
        if (config.authType !== 'none' && !sseToken) throw new Error('凭据丢失');
        const baseUrl = config.sseBaseUrl.replace(/\/$/, '');
        const sseUrl = new URL(`${baseUrl}${config.sseEndpoint}`, window.location.origin);
        sseUrl.searchParams.append('userId', userInfo.id);
        if (sseToken) sseUrl.searchParams.append('sse_token', sseToken);
        es = new EventSource(sseUrl.toString(), config.authType === 'cookie' ? { withCredentials: true } : {});
        es.onopen = () => { alert.success("连接成功!"); setFetchStatus('ok'); setErrorMsg(''); reconnectAttempts = 0; };
        es.onmessage = (e) => {
          if (!e.data.trim()) return;
          const data = JSON.parse(e.data);
          if (data.action === 'reload') {
            alert.success("文件已更新！");
            if (fetchDbRef.current) clearTimeout(fetchDbRef.current);
            fetchDbRef.current = setTimeout(() => performSync(configRef.current, false), configRef.current.fetchDebounce);
          }
        };
        es.onerror = () => {
          es.close(); if (reconnectAttempts < 5) { reconnectAttempts++; reconnectTimer = setTimeout(setupSSE, 3000 * Math.pow(2, reconnectAttempts - 1)); }
          else { alert.success("SSE 重连失败"); setFetchStatus('error'); setErrorMsg('SSE连接失败'); }
        };
      } catch (e) { setFetchStatus('error'); setErrorMsg(e.message); }
    };
    setupSSE();
    return () => { if (reconnectTimer) clearTimeout(reconnectTimer); if (es) es.close(); };
  }, [config.syncMode, config.autoSync, config.sseBaseUrl, config.sseEndpoint, config.authType, userInfo?.id, performSync, syncPaused]);

  const handleManualSync = () => {
    if (fetchDbRef.current) clearTimeout(fetchDbRef.current);
    fetchDbRef.current = setTimeout(() => performSync(configRef.current, false), configRef.current.fetchDebounce);
  };

  const handleCreate = () => {
    if (!appMeta.appName) { alert.warning('请输入应用名称'); return; }
    if (missingRequired.length > 0) { alert.warning(`缺少必要文件：${missingRequired.join('、')}`); return; }
    const installedApps = kernel.getInstalledApps();
    if (installedApps.some(a => a?.[ENV_KEY_NAME] === appMeta.appName)) { alert.warning('名称已被占用'); return; }
    const { appName, appIcon, sysOptions, ...restMetaInfo } = appMeta;
    const baseMetaInfo = { seed: Date.now().toString(), authorId: userInfo?.id, icon: appIcon, ...restMetaInfo };
    const finalSysOptions = { ...sysOptions, userInfo, storePath };
    const cleanFiles = {};
    for (const [k, v] of Object.entries(localFiles)) { cleanFiles[k.replace(/\.(jsx|js)$/, '')] = v; }
    kernel.uploadResource({ sysOptions: finalSysOptions, [ENV_KEY_NAME]: appName, [ENV_KEY_IS_BUNDLE]: true, [ENV_KEY_CONTENT]: cleanFiles, [ENV_KEY_LOGIC]: localLogicCode, [ENV_KEY_META_INFO]: baseMetaInfo });
    alert.success('应用指令已发送');
  };

  const handleNavClick = (id) => setActiveNav(prev => (prev === id ? null : id));
  const drawerOpen = activeNav !== null;
  const displayStatus = syncPaused ? 'paused' : fetchStatus;
  const { mod: stMod } = STATUS_CFG[displayStatus];
  const currentPath = previewState.router?.path || 'home';

  return (
    <div className={style[bem.b()]}>
      <div id="ldv-bar" className={style[bem.e('activity-bar')]}>
        <div className={style[bem.e('bar-top')]}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} className={[style[bem.e('nav-btn')], activeNav === item.id ? style[bem.e('nav-btn--active')] : ''].join(' ')} onClick={() => handleNavClick(item.id)} title={PANEL_TITLES[item.id]}>
              {item.svg}<span className={style[bem.e('nav-label')]}>{item.label}</span>
            </button>
          ))}
        </div>
        <div className={style[bem.e('bar-bottom')]}>
          <button className={[style[bem.e('pause-fab')], syncPaused ? style[bem.e('pause-fab--paused')] : ''].join(' ')} onClick={handleTogglePause} title={syncPaused ? '恢复同步' : '暂停同步'}>
            {syncPaused ? <PlayArrowIcon sx={{fontSize: 16}} /> : <PauseIcon sx={{fontSize: 16}} />}
          </button>
          <span className={[style[bem.e('status-pip')], stMod ? style[bem.e(`status-pip--${stMod}`)] : ''].join(' ')} title={STATUS_CFG[displayStatus].label} />
        </div>
      </div>

      <div className={[style[bem.e('drawer')], drawerOpen ? style[bem.e('drawer--open')] : ''].join(' ')} ref={drawerRef}>
        <div className={style[bem.e('drawer-head')]}><span className={style[bem.e('drawer-title')]}>{activeNav ? PANEL_TITLES[activeNav] : ''}</span><button className={style[bem.e('drawer-close')]} onClick={() => setActiveNav(null)}><CloseIcon sx={{fontSize: 18}} /></button></div>
        <div className={style[bem.e('drawer-scroll')]}>
          {activeNav === 'connect' && <ConnectPanel draft={draft} config={config} setCfg={(k,v)=>setDraft(p=>({...p,[k]:v}))} folderName={folderName} handleSelectFolder={async()=>{try{const h=await window.showDirectoryPicker();folderHandleRef.current=h;setFolderName(h.name);performSync(configRef.current,false);}catch(e){}}} userInfo={userInfo} />}
          {activeNav === 'app' && <AppPanel appMeta={appMeta} updateAppMeta={updateAppMeta} isManualType={isManualType} setIsManualType={setIsManualType} />}
          {activeNav === 'status' && <FilesPanel fetchStatus={displayStatus} lastSync={lastSync} errorMsg={errorMsg} missingRequired={missingRequired} compileErr={compileErr} fileList={fileList} hasLogic={hasLogic} compiling={compiling} handleManualSync={handleManualSync} handleCreate={handleCreate} appMeta={appMeta} syncPaused={syncPaused} onTogglePause={handleTogglePause} />}
          {activeNav === 'debug' && <DebugPanel previewState={previewState} dispatchLogs={dispatchLogs} />}
          {activeNav === 'guide' && <GuidePanel />}
        </div>
        {activeNav === 'connect' && Object.keys(DEFAULT_CONFIG).some(k=>draft[k]!==config[k]) && (
          <div className={style[bem.e('drawer-footer')]}>
            <span className={style[bem.e('footer-hint')]}>有未保存的更改</span>
            <div className={style[bem.e('footer-btns')]}>
              <button className={style[bem.e('footer-discard')]} onClick={()=>setDraft(config)}>放弃</button>
              <button className={style[bem.e('footer-save')]} onClick={()=>{setConfig(draft); localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));}}>保存</button>
            </div>
          </div>
        )}
      </div>

      {drawerOpen && <div className={style[bem.e('drawer-backdrop')]} onClick={() => setActiveNav(null)} />}

      <main className={style[bem.e('canvas')]}>
        <div className={style[bem.e('canvas-bar')]}>
          <span className={style[bem.e('bar-route')]}>{localLogicCode ? `/${currentPath}` : '—'}</span>
          <div className={style[bem.e('bar-right')]}>
            {syncPaused && <span className={[style[bem.e('bar-chip')], style[bem.e('bar-chip--paused')]].join(' ')}>PAUSED</span>}
            {compiling && <span className={style[bem.e('bar-chip')]}>COMPILING</span>}
            {!compiling && localFiles && !compileErr && <span className={[style[bem.e('bar-chip')], style[bem.e('bar-chip--ok')]].join(' ')}>READY</span>}
            <span className={[style[bem.e('bar-status')], stMod ? style[bem.e(`bar-status--${stMod}`)] : ''].join(' ')}>{STATUS_CFG[displayStatus].label}</span>
          </div>
        </div>

        {/* 将原先的 previewId.current 修改为动态的 previewId */}
        <div className={style[bem.e('canvas-body')]} id={`proc-${previewId}`}>
          {Object.keys(localFiles).length === 0 && !compiling && (
            <div className={style[bem.e('canvas-empty')]}>
              <div className={style[bem.e('empty-glyph')]}><BoltIcon sx={{fontSize: 60, color: '#ddd'}} /></div>
              <p className={style[bem.e('empty-text')]}>请检查连接配置或本地服务</p>
              <button className={style[bem.e('empty-cta')]} onClick={() => handleNavClick('connect')}>配置连接</button>
            </div>
          )}

          <RenderProcess
            key={previewId} /* 增加 key，强制 React 卸载旧沙箱引擎 */
            localFiles={localFiles}
            localLogicCode={localLogicCode}
            previewId={previewId}
            onStateChange={setPreviewState}
            onLogAction={(action) => setDispatchLogs(prev => [...prev.slice(-99), { t: new Date().toLocaleTimeString(), a: action }])}
            onCompileStart={() => setCompiling(true)}
            onCompileEnd={() => setCompiling(false)}
            onCompileError={setCompileErr}
          />
        </div>
      </main>
    </div>
  );
};

export default memo(LocalDev);

import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import style from './style.module.css';
import { createNamespace } from '@/utils/js/classcreate';
import { devAppSdk } from "@/main/resources/sdk";
import { compileSourceAsync, scopeCss } from '@/utils/process/renderWindow';

const bem = createNamespace('appview');

const generatePreviewWorker = (fullLogicCode, isBundle) => {
  return `
    ${fullLogicCode}

    let _state = {};

    const getInitialState = () => {
      return typeof initialState !== 'undefined' ? initialState : {};
    };

    const getReducer = () => {
      return typeof reducer === 'function' ? reducer : (s) => s;
    };

    const init = () => {
      try {
        _state = getInitialState();
        if (${isBundle} && !_state.router) _state.router = { path: 'home' };
      } catch (e) {
        console.error('Initial state error:', e);
        _state = {};
      }
      broadcast();
    };

    const handleDispatch = (action) => {
      try {
        const reducerFn = getReducer();
        const nextState = reducerFn(_state, action);

        let finalState = nextState;
        if (${isBundle} && action.type === 'NAVIGATE') {
           const currentRouter = finalState.router || { path: 'home' };
           finalState = {
             ...finalState,
             router: { ...currentRouter, path: action.payload }
           };
        }

        if (finalState !== _state) {
          _state = finalState;
          broadcast();
        }
      } catch (e) {
        console.error('Reducer error:', e);
      }
    };

    const broadcast = () => {
      self.postMessage({ type: 'STATE_UPDATE', payload: _state });
    };

    self.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'INIT') {
        init();
      } else if (type === 'DISPATCH') {
        handleDispatch(payload);
      }
    };
  `;
};

const createPreviewSDK = (dispatch) => {
  const sdk = {
    ...devAppSdk,
    API: {
      ...devAppSdk.API,
      navigate: (path) => dispatch({ type: 'NAVIGATE', payload: path }),
      fetch: window.fetch.bind(window),
    }
  };
  return Object.freeze(sdk);
};

const AppView = ({ app }) => {
  const [state, setState] = useState({});
  const [modules, setModules] = useState(null);
  const workerRef = useRef(null);
  const previewId = useRef(`preview-${Date.now()}`);

  useEffect(() => {
    if (!app) return;
    const workerCode = generatePreviewWorker(
      app.logicCode || '',
      app.isBundle
    );
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    worker.onmessage = (e) => {
      if (e.data.type === 'STATE_UPDATE') {
        setState(e.data.payload);
      }
    };

    worker.postMessage({ type: 'INIT' });
    workerRef.current = worker;

    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  }, [app]);

  useEffect(() => {
    if (!app) return;
    const compile = async () => {
      const dispatch = (action) => workerRef.current?.postMessage({ type: 'DISPATCH', payload: action });
      const sdk = createPreviewSDK(dispatch);
      const resultMap = {};

      if (app.isBundle && app.files) {
          for (const [filename, code] of Object.entries(app.files)) {
              const res = await compileSourceAsync(code);
              if (!res.error) {
                  const exports = {};
                  res.factory({ exports }, exports, sdk);
                  const key = filename.replace('.jsx', '');
                  resultMap[key] = {
                      Component: exports.default || exports,
                      style: exports.style || ''
                  };
              }
          }
      } else {
          const res = await compileSourceAsync(app.viewCode);
          if (!res.error) {
            const exports = {};
            res.factory({ exports }, exports, sdk);
            resultMap['main'] = {
              Component: exports.default || exports,
              style: exports.style || ''
            };
          }
      }
      setModules(resultMap);
    };
    compile();
  }, [app]);

  useEffect(() => {
    if (!modules) return;
    const css = Object.values(modules).map(m => m.style).join('\n');
    if (!css) return;

    const id = `css-${previewId.current}`;
    let styleTag = document.getElementById(id);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = id;
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = scopeCss ? scopeCss(css, previewId.current) : css;

    return () => styleTag.remove();
  }, [modules]);

  const dispatch = (action) => workerRef.current?.postMessage({ type: 'DISPATCH', payload: action });
  const navigate = (path) => dispatch({ type: 'NAVIGATE', payload: path });

  const { RootComponent, ChildComponent } = useMemo(() => {
    if (!app || !modules) return { RootComponent: null, ChildComponent: null };

    if (app.isBundle) {
      const Layout = modules['layout']?.Component || modules['main']?.Component;
      if (!Layout) return { RootComponent: () => <div className={style[bem.e('error')]}>资源layout.jsx缺失</div>, ChildComponent: null };

      const currentPath = state.router?.path || 'home';
      const Page = modules[currentPath]?.Component || (() => <div>404: {currentPath}</div>);

      return { RootComponent: Layout, ChildComponent: Page };
    } else {
      const Main = modules['main']?.Component || modules['layout']?.Component;
      if (!Main) return { RootComponent: () => <div className={style[bem.e('error')]}>主组件丢失</div>, ChildComponent: null };

      return { RootComponent: Main, ChildComponent: () => <div style={{padding:10, color:'#999'}}>单页组件</div> };
    }
  }, [app, modules, state.router?.path]);

  if (!app) return null;
  if (!modules) return <div className={style[bem.e('loading')]}>加载预览中...</div>;

  const commonProps = {
    state,
    dispatch,
    navigate,
    pid: previewId.current
  };

  return (
    <div className={style[bem.b()]} id={`proc-${previewId.current}`}>
      <div className={style[bem.e('header')]}>
        <span className={style[bem.e('title')]}>应用预览:{app.appName}</span>
      </div>
      <div className={style[bem.e('content')]}>
        {RootComponent && (
            <RootComponent
                {...commonProps}
                PageComponent={(props) => ChildComponent ? <ChildComponent {...commonProps} {...props} /> : null}
            />
        )}
      </div>
    </div>
  );
};

export default memo(AppView);

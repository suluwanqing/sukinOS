import style from "./style.module.css";
import { createNamespace } from '@/utils/js/classcreate';
import SearchIcon from '@mui/icons-material/Search';
import React, { useState, useEffect } from "react";
const bem = createNamespace('status');
  // const StartBtn = () => (
  //       <div className={[style[bem.e('icon-box')],style['start-btn']].join(' ')}>
  //           <WindowIcon sx={{ color: '#0078d4', fontSize: 26 }} />
  //       </div>
  //   );
    const SearchBar = () => (
        <div className={style[bem.e('search-bar')]}>
            <SearchIcon sx={{ color: '#666', fontSize: 20 }} />
            <span className={style[bem.e('search-text')]}>搜索</span>
        </div>
);
const Apps = ({ apps, startApp }) => {
 return  (
    <>
      {apps.map((app) => (
        <div
          onClick={() => startApp(app.pid)}
          key={app.pid}
          className={[style[bem.e('icon-box')],
          style[bem.is('active', app.status !== 'INSTALLED')]].join(' ')}
        >
          <div className={style[bem.e('app-icon')]} >
            <img src={app.metaInfo?.icon} alt="" />
          </div>
          {app.status === 'RUNNING' && <div className={style[bem.e('active-indicator')]}></div>}
          {app.status === 'HIBERNATED' && <div className={style[bem.e('active-hibernated')]}></div>}
          <div className={style[bem.e('hover-indicator')]}></div>
        </div>
      ))}
    </>

  )
}
function StatusBar({ blockEdApps,runningApps, hibernatedApps,startApp }) {
  const [apps,setApps]=useState([])
  useEffect(() => {
    //因为这里blockEd可能会和其他重复
        setApps([...new Set([...blockEdApps,...runningApps,...hibernatedApps])])
  },[blockEdApps,runningApps,hibernatedApps])
    return (
        <div className={[style[bem.b()],style[bem.b('mode-mac')]].join(' ')}>
            <div className={style[bem.e('container')]}>
                    <div className={style[bem.e('mac-layout')]}>
            { (apps &&  apps.length>0 )&&<div className={style[bem.e('mac-row-top')]}>
              {/* <StartBtn/> */}
                 <Apps apps={apps} startApp={startApp} />
            </div>}
                        <div className={style[bem.e('mac-row-bottom')]}>
                            <SearchBar/>
                        </div>
                    </div>

            </div>
        </div>
    );
}
export default React.memo(StatusBar);

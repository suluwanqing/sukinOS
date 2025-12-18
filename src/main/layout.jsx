import { useEffect, useRef, useState } from 'react';
import style from "./style.module.css";
import { createNamespace } from '@/utils/js/classcreate';
import LoginLayout from './login/layout';
import OverPlay from "@/component/overPlay/layout"
const bem = createNamespace('admin');

const PAGE_CONFIG = {
  hero: {
    subtitle: 'Sukin',
    title: '求放过',
    buttonText: '体验'
  },
  metaInfo: [
    { id: 1, title: 'WindowUi', sub: '独属于你的管理后台' },
    { id: 2, title: '可拓展性', sub: '可自由上传/开发功能' },
    { id: 3, title: '自由管理', sub: '自定义管理面板,自由管理' }
  ], 
  canvas: {
    particles: {
      count: 150,
      colors: ['#06b6d4', '#0ea5e9', '#3b82f6', '#a855f7', '#0284c7']
    },
    background: {
      stops: [
        { offset: 0, color: '#ecfeff' },
        { offset: 0.5, color: '#e0f2fe' },
        { offset: 1, color: '#f0f9ff' }
      ]
    }
  }
};

function Admin() {
  const container = useRef(null);
  const [isOpen,setIsOpen]=useState(false)
  const initCanvas = () => {
    const canvas = container.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const { particles: particleConfig, background: bgConfig } = PAGE_CONFIG.canvas;
    const noteSymbols = ['♩', '♪', '♫', '♬', '♭', '♯', 'ø', '𝄢'];
    const laneCount = 5;
    const laneSpacing = 60;
    const centerY = canvas.height * 0.6;
    const notes = [];
    let time = 0;
    let frame = 0;
    let animationId;

    const getWaveY = (x, laneIndex, t) => {
        const laneOffset = (laneIndex - (laneCount - 1) / 2) * laneSpacing;
        const wave = Math.sin(x * 0.004 + t) * 15 + Math.cos(x * 0.01 - t * 1.5) * 10;
        return centerY + laneOffset + wave;
    };

    const createNote = () => {
        const lane = Math.floor(Math.random() * laneCount);
        const startX = Math.random() * (canvas.width - 200) + 100;
        return {
            x: startX,
            y: -60,
            lane: lane,
            symbol: noteSymbols[Math.floor(Math.random() * noteSymbols.length)],
            color: particleConfig.colors[Math.floor(Math.random() * particleConfig.colors.length)],
            size: Math.random() * 10 + 24,
            vy: Math.random() * 3 + 4,
            state: 'falling',
            hitTime: 0,
            opacity: 0,
            rotation: (Math.random() - 0.5) * 0.5
        };
    };

    const animate = () => {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgConfig.stops.forEach(stop => {
            gradient.addColorStop(stop.offset, stop.color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        time += 0.03;
        frame++;

        for (let i = 0; i < laneCount; i++) {
            ctx.beginPath();
            ctx.moveTo(0, getWaveY(0, i, time));
            for (let x = 0; x <= canvas.width; x += 20) {
                ctx.lineTo(x, getWaveY(x, i, time));
            }
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + (i === 2 ? 0.2 : 0)})`;
            ctx.lineWidth = i === 2 ? 2 : 1;
            ctx.stroke();
        }

        if (frame % 30 === 0) {
            notes.push(createNote());
        }

        for (let i = notes.length - 1; i >= 0; i--) {
            const note = notes[i];

            if (note.opacity < 1 && note.state === 'falling') {
                note.opacity += 0.05;
            }

            const waterLevel = getWaveY(note.x, note.lane, time);

            if (note.state === 'falling') {
                note.y += note.vy;
                if (note.y >= waterLevel - 15) {
                    note.y = waterLevel;
                    note.state = 'flowing';
                    note.hitTime = time;

                    ctx.beginPath();
                    ctx.ellipse(note.x, note.y, 40, 10, 0, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            } else {
                note.x -= 2;
                note.y = getWaveY(note.x, note.lane, time);
                note.rotation += 0.01;
                note.opacity -= 0.003;
            }

            if (note.x < -50 || note.opacity <= 0) {
                notes.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.translate(note.x, note.y);
            ctx.rotate(note.rotation);

            let scale = 1;
            if (note.state === 'flowing') {
                const diff = time - note.hitTime;
                if (diff < 1.0) {
                    scale = 1 + Math.sin(diff * 15) * 0.4 * Math.exp(-diff * 2);
                }
            }
            ctx.scale(scale, scale);

            ctx.font = `${note.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = note.color;
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = Math.max(0, note.opacity);
            ctx.fillText(note.symbol, 0, 0);
            ctx.restore();
        }

        animationId = requestAnimationFrame(animate);
    };

    animate();
    return animationId;
};
  const handleResize = () => {
    if (container.current) {
      container.current.width = window.innerWidth;
      container.current.height = window.innerHeight;
    }
  };

  useEffect(() => {
    const animationId = initCanvas();
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className={style[bem.b()]}>
      <canvas ref={container} className={style[bem.e('canvas')]}></canvas>
      <div className={style[bem.e('content')]}>
        <div className={style[bem.e('logo')]}>
          <img  src="/logo.jpg"  />
        </div>
        <div className={style[bem.e('header')]}>
          <span className={style[bem.e('subtitle')]}>{PAGE_CONFIG.hero.subtitle}</span>
          <h1 className={style[bem.e('title')]}>{PAGE_CONFIG.hero.title}</h1>
        </div>
        <button className={style[bem.e('btn')]} onClick={()=>setIsOpen(true)}>{PAGE_CONFIG.hero.buttonText}</button>
        <div className={style[bem.e('metainfo')]}>
          {PAGE_CONFIG.metaInfo.map(stat => (
            <div key={stat.id} className={style[bem.e('card')]}>
              <span className={style[bem.e('title')]}>{stat.title}</span>
              <span className={style[bem.e('sub')]}>{stat.sub}</span>
            </div>
          ))}
        </div>
      </div>
      {isOpen && <OverPlay isFixed={true} closeFunc={()=>setIsOpen(false)} >
        <LoginLayout />
      </OverPlay>
      }
    </div>
  );
}

export default Admin;

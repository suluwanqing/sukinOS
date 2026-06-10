import React from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import ArticleIcon from '@mui/icons-material/Article';

const bem = createNamespace('setting-manual');

const ManualRenderer = ({ title, paragraphs }) => (
  <div className={style[bem.b()]}>
    <div className={style[bem.e('header')]}>
      <ArticleIcon className={style[bem.e('icon')]} />
      <h2 className={style[bem.e('title')]}>{title}</h2>
    </div>
    <div className={style[bem.e('divider')]} />
    <div className={style[bem.e('body')]}>
      {paragraphs.map((text, index) => (
        <p key={index} className={style[bem.e('p')]}>
          {text}
        </p>
      ))}
    </div>
  </div>
);

export default ManualRenderer;

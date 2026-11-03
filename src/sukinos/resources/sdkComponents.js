import * as AllComponent from '@/component/main';
import { KeepAlive } from '@/sukinos/components/KeepAliveViewport';

/**
 * 普通应用可见的组件集合。
 * sdk.jsx 用它拼 AppSDK.Components，设置-组件页也读它渲染文档，
 * 两边共用一份，文档清单不会与 SDK 漂移。
 */
export const publicSdkComponents = { ...AllComponent, KeepAlive };

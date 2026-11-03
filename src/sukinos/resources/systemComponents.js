import Developer from '@/sukinos/resources/developer/layout';
import FileSystem from '@/sukinos/resources/fileSystem/layout';
import NoteBook from '@/sukinos/resources/notebook/layout';
import Setting from '@/sukinos/resources/setting/layout';
import Start from '@/sukinos/resources/start/layout';
import Store from '@/sukinos/resources/store/layout';
import LocalDev from '@/sukinos/resources/localDev/layout';
import SystemDashboard from '@/sukinos/resources/systemManage/layout';
import DrawBoard from '@/sukinos/resources/drawBoard/layout';
import Sheet from '@/sukinos/resources/sheet/layout';
import UniversalViewer from '@/sukinos/resources/universalViewer/layout';

/**
 * 系统应用可见的面板集合。
 * sdk.jsx 用它拼 adminAppSdk.Components，系统面板统一在这里导入，
 * 增减面板只需要改这一处。
 */
export const systemSdkComponents = {
  Developer,
  FileSystem,
  NoteBook,
  Setting,
  Start,
  Store,
  LocalDev,
  SystemDashboard,
  DrawBoard,
  Sheet,
  UniversalViewer,
};

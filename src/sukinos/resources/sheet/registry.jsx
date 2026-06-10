import {getLogoBase64Url} from "@/component/logo/layout";
const logo = () => {
  return getLogoBase64Url();
};
export default {
  "ENV_KEY_RESOURCE_ID": 'sys-sheet',
  "ENV_KEY_NAME": '表格',
  "ENV_KEY_IS_BUNDLE": false,
  "ENV_KEY_CONTENT": `
    export default ({ PageComponent, navigate, state, dispatch, pid }) => {
        const { Components } = AppSDK;
        const Sheet = Components.Sheet;
        return (
            <div style={{height:'100%', width:'100%', display:'flex', flexDirection:'column'}}>
                <Sheet state={state} dispatch={dispatch} navigate={navigate} pid={pid} />
            </div>
        );
    }
  `,
  "ENV_KEY_LOGIC": `
    const initialState = {
      tables: [
        {
          id: 'tbl_init_1',
          name: '项目目标与任务',
          columns: [
            { id: 'col_1', name: '任务名称', type: 'text', width: 260, defaultValue: '', sortable: true },
            { id: 'col_2', name: '状态', type: 'select', width: 140, defaultValue: '待处理', sortable: true, options: [
              { id: 'opt_1', label: '待处理', color: '#e2e8f0' },
              { id: 'opt_2', label: '进行中', color: '#bfdbfe' },
              { id: 'opt_3', label: '已完成', color: '#bbf7d0' },
              { id: 'opt_4', label: '已阻塞', color: '#fecaca' }
            ]},
            { id: 'col_3', name: '预估耗时', type: 'number', width: 120, defaultValue: '1', sortable: true },
            { id: 'col_4', name: '截止日期', type: 'date', width: 140, defaultValue: '', sortable: true },
            { id: 'col_5', name: '优先级高', type: 'boolean', width: 100, defaultValue: false, sortable: true }
          ]
        }
      ],
      records: {
        tbl_init_1: [
          {
            id: 'rec_1', col_1: '核心模块开发', col_2: '进行中', col_3: 15, col_4: '2026-01-01', col_5: true,
            children: [
              { id: 'rec_1_1', col_1: '表格视图重构', col_2: '已完成', col_3: 5, col_4: '2026-01-01', col_5: true, children: [] },
              { id: 'rec_1_2', col_1: '增加树形层级', col_2: '进行中', col_3: 3, col_4: '2026-01-01', col_5: false, children: [] }
            ]
          },
          { id: 'rec_2', col_1: 'UI交互优化', col_2: '待处理', col_3: 8, col_4: '2026-03-10', col_5: false, children: [] }
        ]
      },
      activeTableId: 'tbl_init_1',
      openTabs: ['tbl_init_1'],
      activeTab: 'tbl_init_1',
      configs: {
        tbl_init_1: { viewType: 'grid', search: '', sortKey: null, sortDir: 'asc', hiddenFields: [], expandedRows: ['rec_1'] }
      },
      presetColumns: [
        { id: 'pre_1', name: '任务名称', type: 'text', defaultValue: '', isSystem: true, enabled: true, sortable: true },
        { id: 'pre_2', name: '状态', type: 'select', defaultValue: '待处理', isSystem: true, enabled: true, sortable: true, options: [
          { id: 'opt_1', label: '待处理', color: '#e2e8f0' },
          { id: 'opt_2', label: '进行中', color: '#bfdbfe' },
          { id: 'opt_3', label: '已完成', color: '#bbf7d0' },
          { id: 'opt_4', label: '已阻塞', color: '#fecaca' }
        ]},
        { id: 'pre_3', name: '预估耗时', type: 'number', defaultValue: '1', isSystem: true, enabled: true, sortable: true },
        { id: 'pre_4', name: '截止日期', type: 'date', defaultValue: '', isSystem: true, enabled: true, sortable: true },
        { id: 'pre_5', name: '优先级高', type: 'boolean', defaultValue: false, isSystem: true, enabled: true, sortable: true, trueLabel: '已完成', falseLabel: '未开始' },
        { id: 'pre_6', name: '进度条', type: 'progress', defaultValue: 0, isSystem: true, enabled: true, sortable: true }
      ]
    };

    function arrayMoveMutable(array, fromIndex, toIndex) {
      const startIndex = fromIndex < 0 ? array.length + fromIndex : fromIndex;
      if (startIndex >= 0 && startIndex < array.length) {
        const endIndex = toIndex < 0 ? array.length + toIndex : toIndex;
        const [item] = array.splice(fromIndex, 1);
        array.splice(endIndex, 0, item);
      }
    }

    function addRecordToTree(records, parentId, newRecord) {
      if (!parentId) return [...records, newRecord];
      return records.map(rec => {
        if (rec.id === parentId) {
          return { ...rec, children: [...(rec.children || []), newRecord] };
        } else if (rec.children && rec.children.length > 0) {
          return { ...rec, children: addRecordToTree(rec.children, parentId, newRecord) };
        }
        return rec;
      });
    }

    function updateRecordInTree(records, recordId, fieldId, value) {
      return records.map(rec => {
        if (rec.id === recordId) {
          return { ...rec, [fieldId]: value };
        } else if (rec.children && rec.children.length > 0) {
          return { ...rec, children: updateRecordInTree(rec.children, recordId, fieldId, value) };
        }
        return rec;
      });
    }

    function deleteRecordInTree(records, recordId) {
      return records.filter(rec => rec.id !== recordId).map(rec => {
        if (rec.children && rec.children.length > 0) {
          return { ...rec, children: deleteRecordInTree(rec.children, recordId) };
        }
        return rec;
      });
    }

    function reducer(state = initialState, action) {
      if (action?.openType) return state;
      const currentPresetColumns = state.presetColumns || initialState.presetColumns;
      switch (action.type) {
        case 'LOAD_STATE':
          return {
            ...state,
            ...action.payload,
            presetColumns: action.payload.presetColumns || currentPresetColumns
          };
        case 'RENAME_TABLE': {
          const { tableId, name } = action.payload;
          return {
            ...state,
            tables: state.tables.map(t => t.id === tableId ? { ...t, name } : t)
          };
        }
        case 'SET_ACTIVE_TABLE': {
          const tableId = action.payload;
          const nextTabs = state.openTabs.includes(tableId) ? state.openTabs : [...state.openTabs, tableId];
          return {
            ...state,
            activeTableId: tableId,
            openTabs: nextTabs,
            activeTab: tableId
          };
        }
        case 'SET_ACTIVE_TAB':
          return {
            ...state,
            activeTab: action.payload,
            activeTableId: action.payload.startsWith('tbl_') ? action.payload : state.activeTableId
          };
        case 'CLOSE_TAB': {
          const tabId = action.payload;
          const nextTabs = state.openTabs.filter(id => id !== tabId);
          let nextActive = state.activeTab;
          if (state.activeTab === tabId) {
            nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : '';
          }
          return {
            ...state,
            openTabs: nextTabs,
            activeTab: nextActive,
            activeTableId: nextActive && nextActive.startsWith('tbl_') ? nextActive : state.activeTableId
          };
        }
        case 'OPEN_MANUAL_TAB': {
          const nextTabs = state.openTabs.includes('manual') ? state.openTabs : [...state.openTabs, 'manual'];
          return {
            ...state,
            openTabs: nextTabs,
            activeTab: 'manual'
          };
        }
        case 'OPEN_PRESETS_TAB': {
          const nextTabs = state.openTabs.includes('presets') ? state.openTabs : [...state.openTabs, 'presets'];
          return {
            ...state,
            openTabs: nextTabs,
            activeTab: 'presets'
          };
        }
        case 'REORDER_TABS': {
          const { dragIndex, hoverIndex } = action.payload;
          const nextTabs = [...state.openTabs];
          const [dragged] = nextTabs.splice(dragIndex, 1);
          nextTabs.splice(hoverIndex, 0, dragged);
          return {
            ...state,
            openTabs: nextTabs
          };
        }
        case 'ADD_TABLE': {
          const newTable = action.payload;
          return {
            ...state,
            tables: [...state.tables, newTable.schema],
            records: { ...state.records, [newTable.schema.id]: newTable.records || [] },
            configs: { ...state.configs, [newTable.schema.id]: { viewType: 'grid', search: '', sortKey: null, sortDir: 'asc', hiddenFields: [], expandedRows: [] } },
            activeTableId: newTable.schema.id,
            openTabs: [...state.openTabs, newTable.schema.id],
            activeTab: newTable.schema.id
          };
        }
        case 'DELETE_TABLE': {
          const newTables = state.tables.filter(t => t.id !== action.payload);
          const newRecords = { ...state.records };
          delete newRecords[action.payload];
          const nextTabs = state.openTabs.filter(id => id !== action.payload);
          let nextActive = state.activeTab;
          if (state.activeTab === action.payload) {
            nextActive = nextTabs.length > 0 ? nextTabs[0] : '';
          }
          return {
            ...state,
            tables: newTables,
            records: newRecords,
            openTabs: nextTabs,
            activeTab: nextActive,
            activeTableId: nextActive && nextActive.startsWith('tbl_') ? nextActive : (newTables.length > 0 ? newTables[0].id : null)
          };
        }
        case 'ADD_COLUMN': {
          const { tableId, column } = action.payload;
          const table = state.tables.find(t => t.id === tableId);
          if (!table) return state;
          const updatedTable = { ...table, columns: [...table.columns, column] };
          return {
            ...state,
            tables: state.tables.map(t => t.id === tableId ? updatedTable : t)
          };
        }
        case 'UPDATE_COLUMN': {
          const { tableId, colId, data } = action.payload;
          const table = state.tables.find(t => t.id === tableId);
          if (!table) return state;
          const updatedColumns = table.columns.map(c => c.id === colId ? { ...c, ...data } : c);
          return {
            ...state,
            tables: state.tables.map(t => t.id === tableId ? { ...t, columns: updatedColumns } : t)
          };
        }
        case 'DELETE_COLUMN': {
          const { tableId, colId } = action.payload;
          const table = state.tables.find(t => t.id === tableId);
          if (!table) return state;
          const updatedColumns = table.columns.filter(c => c.id !== colId);
          return {
            ...state,
            tables: state.tables.map(t => t.id === tableId ? { ...t, columns: updatedColumns } : t)
          };
        }
        case 'REORDER_COLUMNS': {
          const { tableId, activeId, overId } = action.payload;
          const table = state.tables.find(t => t.id === tableId);
          if (!table) return state;
          const oldIndex = table.columns.findIndex(c => c.id === activeId);
          const newIndex = table.columns.findIndex(c => c.id === overId);
          const newColumns = [...table.columns];
          arrayMoveMutable(newColumns, oldIndex, newIndex);
          return {
            ...state,
            tables: state.tables.map(t => t.id === tableId ? { ...t, columns: newColumns } : t)
          };
        }
        case 'ADD_RECORD': {
          const { tableId, record, parentId } = action.payload;
          const tableRecords = state.records[tableId] || [];
          const newRecords = addRecordToTree(tableRecords, parentId, record);
          return {
            ...state,
            records: { ...state.records, [tableId]: newRecords }
          };
        }
        case 'UPDATE_RECORD': {
          const { tableId, recordId, fieldId, value } = action.payload;
          const tableRecords = state.records[tableId] || [];
          const newRecords = updateRecordInTree(tableRecords, recordId, fieldId, value);
          return {
            ...state,
            records: { ...state.records, [tableId]: newRecords }
          };
        }
        case 'DELETE_RECORD': {
          const { tableId, recordId } = action.payload;
          const tableRecords = state.records[tableId] || [];
          const newRecords = deleteRecordInTree(tableRecords, recordId);
          return {
            ...state,
            records: { ...state.records, [tableId]: newRecords }
          };
        }
        case 'UPDATE_CONFIG': {
          const { tableId, key, value } = action.payload;
          const currentConfig = state.configs[tableId] || { viewType: 'grid', search: '', sortKey: null, sortDir: 'asc', hiddenFields: [], expandedRows: [] };
          return {
            ...state,
            configs: {
              ...state.configs,
              [tableId]: { ...currentConfig, [key]: value }
            }
          };
        }
        case 'IMPORT_DATA': {
          const { schema, records } = action.payload;
          return {
            ...state,
            tables: [...state.tables, schema],
            records: { ...state.records, [schema.id]: records },
            configs: { ...state.configs, [schema.id]: { viewType: 'grid', search: '', sortKey: null, sortDir: 'asc', hiddenFields: [], expandedRows: [] } },
            activeTableId: schema.id,
            openTabs: [...state.openTabs, schema.id],
            activeTab: schema.id
          };
        }
        case 'ADD_PRESET': {
          return {
            ...state,
            presetColumns: [...currentPresetColumns, action.payload]
          };
        }
        case 'TOGGLE_PRESET': {
          return {
            ...state,
            presetColumns: currentPresetColumns.map(p => p.id === action.payload ? { ...p, enabled: !p.enabled } : p)
          };
        }
        case 'DELETE_PRESET': {
          return {
            ...state,
            presetColumns: currentPresetColumns.filter(p => p.id !== action.payload)
          };
        }
        case 'UPDATE_PRESET': {
          const { presetId, data } = action.payload;
          return {
            ...state,
            presetColumns: currentPresetColumns.map(p => p.id === presetId ? { ...p, ...data } : p)
          };
        }
        default:
          return state;
      }
    }
  `,
  "ENV_KEY_META_INFO": {
    version: 'v5',
    icon: logo(),
    appType: 'system',
    worker:true,
    exposeState: false,
    saveState: true,
    isParasitism: true,
    custom: {
      hasShortcut: true,
      blockEd: false
    }
  }
}

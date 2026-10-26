import {
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleUser,
  Cloud,
  CloudUpload,
  ExternalLink,
  FileCheck,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GitBranch,
  Info,
  Link2,
  LoaderCircle,
  Monitor,
  PenLine,
  Play,
  Rocket,
  Search,
  Send,
  Share2,
  Trash2,
  TriangleAlert,
  Upload,
  Utensils,
  Wallet,
  Wrench,
} from 'lucide-react'

// 键沿用调用方数据里已有的 icon-* 串（沙箱内用户应用传的也是这些串，改名会让它们静默变空白）；
// 旧字体图标的码点只存在于 alicdn 私有字体、仓库无对应 SVG，所以值是按语义人工对齐的显式 import。
const REGISTRY = {
  'icon-a-document': FileText,
  'icon-a-document-add': FilePlus,
  'icon-a-document-checked': FileCheck,
  'icon-a-folder': Folder,
  'icon-a-folder-add': FolderPlus,
  'icon-a-folder-opened': FolderOpen,
  'icon-folder': Folder,
  'icon-folder-opened': FolderOpen,
  'icon-a-edit-pen': PenLine,
  'icon-a-delete-filled': Trash2,
  'icon-trash': Trash2,
  'icon-a-upload-filled': Upload,
  'icon-cloud-upload': CloudUpload,
  'icon-ios-cloud-upload': CloudUpload,
  'icon-ios-cloud-outline': Cloud,
  'icon-a-avatar': CircleUser,
  'icon-a-search': Search,
  'icon-a-s-tools': Wrench,
  'icon-a-fork-spoon': Utensils,
  'icon-a-warning-filled': TriangleAlert,
  'icon-a-loading': LoaderCircle,
  'icon-info': Info,
  'icon-play': Play,
  'icon-record': Circle,
  'icon-chevron-down': ChevronDown,
  'icon-chevron-right': ChevronRight,
  'icon-chevron-up': ChevronUp,
  'icon-arrow-right': ArrowRight,
  'icon-gitee': GitBranch,
  'icon-ios-cash': Wallet,
  'icon-a-share': Share2,
  'icon-ios-desktop': Monitor,
  'icon-ios-open': ExternalLink,
  'icon-ios-radio-button-off': Circle,
  'icon-ios-swap': ArrowLeftRight,
  'icon-link': Link2,
  'icon-rocket': Rocket,
  'icon-send': Send,
}

/** name 三态：字符串查表；非字符串（节点或元素）原样透传，因为调用方有的传组件、有的传空串；查不到渲染空 */
export function UiIcon({ name, size = 20, className, ...rest }) {
  if (name === null || name === undefined || name === '') return null
  if (typeof name !== 'string') return name
  const Icon = REGISTRY[name]
  if (!Icon) return null
  return <Icon size={size} className={className} {...rest} />
}

export default UiIcon

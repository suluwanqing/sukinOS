import JSZip from 'jszip'
import {FileType} from '@/sukinos/utils/config'
import {dataDeBase64Mapper} from '/utils/js/func/data/exChangeBase64'

export const FileCategory = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  CODE: 'code',
  MARKDOWN: 'markdown',
  HTML: 'html',
  DOCX: 'docx',
  XLSX: 'xlsx',
  JSON: 'json',
  PDF: 'pdf',
  ARCHIVE: 'archive',
  HEX: 'hex',
}

const EXTENSION_MAP = {
  png: FileCategory.IMAGE,
  jpg: FileCategory.IMAGE,
  jpeg: FileCategory.IMAGE,
  gif: FileCategory.IMAGE,
  webp: FileCategory.IMAGE,
  svg: FileCategory.IMAGE,
  bmp: FileCategory.IMAGE,
  ico: FileCategory.IMAGE,
  mp4: FileCategory.VIDEO,
  webm: FileCategory.VIDEO,
  ogg: FileCategory.VIDEO,
  mov: FileCategory.VIDEO,
  mkv: FileCategory.VIDEO,
  mp3: FileCategory.AUDIO,
  wav: FileCategory.AUDIO,
  flac: FileCategory.AUDIO,
  aac: FileCategory.AUDIO,
  m4a: FileCategory.AUDIO,
  js: FileCategory.CODE,
  jsx: FileCategory.CODE,
  ts: FileCategory.CODE,
  tsx: FileCategory.CODE,
  css: FileCategory.CODE,
  scss: FileCategory.CODE,
  py: FileCategory.CODE,
  java: FileCategory.CODE,
  c: FileCategory.CODE,
  cpp: FileCategory.CODE,
  sql: FileCategory.CODE,
  sh: FileCategory.CODE,
  xml: FileCategory.CODE,
  yml: FileCategory.CODE,
  yaml: FileCategory.CODE,
  txt: FileCategory.CODE,
  conf: FileCategory.CODE,
  env: FileCategory.CODE,
  log: FileCategory.CODE,
  html: FileCategory.HTML,
  htm: FileCategory.HTML,
  md: FileCategory.MARKDOWN,
  markdown: FileCategory.MARKDOWN,
  docx: FileCategory.DOCX,
  doc: FileCategory.DOCX,
  xlsx: FileCategory.XLSX,
  xls: FileCategory.XLSX,
  csv: FileCategory.XLSX,
  json: FileCategory.JSON,
  pdf: FileCategory.PDF,
  zip: FileCategory.ARCHIVE,
}

export const detectCategory = (filename = '') => {
  const cleanName = filename.split('?')[0].split('#')[0]
  const ext = cleanName.includes('.') ? cleanName.split('.').pop()?.toLowerCase() || '' : ''
  return EXTENSION_MAP[ext] || FileCategory.HEX
}

export const getMonacoLanguage = (filename = '') => {
  const cleanName = filename.split('?')[0].split('#')[0]
  const ext = cleanName.includes('.') ? cleanName.split('.').pop()?.toLowerCase() || '' : ''
  const langMap = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    md: 'markdown',
    markdown: 'markdown',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    sql: 'sql',
    sh: 'shell',
    xml: 'xml',
    yml: 'yaml',
    yaml: 'yaml',
    txt: 'plaintext',
  }
  return langMap[ext] || 'plaintext'
}

export async function createEmptyDocxArrayBuffer() {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>'
  )
  zip
    .folder('_rels')
    .file(
      '.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>'
    )
  zip
    .folder('word')
    .file(
      'document.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body><w:p><w:r><w:t></w:t></w:r></w:p></w:body>' +
        '</w:document>'
    )
  return await zip.generateAsync({type: 'arraybuffer'})
}

function binaryStringToUint8Array(str) {
  const len = str.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff
  }
  return bytes
}

export async function parseFileData(fileItem, rawContent, handleRegistry, mode) {
  if (
    fileItem.type === FileType.DIRECTORY ||
    fileItem.type === 2 ||
    fileItem.type === 'directory'
  ) {
    throw new Error('所选项目是文件夹，万能查看器仅支持查看具体文件')
  }

  let realName = fileItem.name || ''
  let arrayBuffer = null
  let mimeType = ''

  if (mode === 'local' && handleRegistry) {
    const record = handleRegistry.get(fileItem.id)
    if (record?.handle) {
      try {
        const file = await record.handle.getFile()
        realName = file.name || realName
        mimeType = file.type || ''
        arrayBuffer = await file.arrayBuffer()
      } catch (e) {
        console.warn(e)
      }
    }
  }

  let category = detectCategory(realName)

  if (!arrayBuffer && rawContent !== undefined && rawContent !== null) {
    if (rawContent instanceof ArrayBuffer) {
      arrayBuffer = rawContent
    } else if (rawContent instanceof Blob) {
      mimeType = rawContent.type || ''
      arrayBuffer = await rawContent.arrayBuffer()
    } else if (rawContent instanceof Uint8Array) {
      arrayBuffer = rawContent.buffer
    } else if (typeof rawContent === 'string') {
      if (rawContent.startsWith('data:')) {
        const [meta, b64] = rawContent.split(',')
        mimeType = meta.split(':')[1]?.split(';')[0] || ''
        try {
          arrayBuffer = await dataDeBase64Mapper(b64, 'Image')
        } catch (e) {
          const bin = atob(b64)
          arrayBuffer = binaryStringToUint8Array(bin).buffer
        }
      } else if (
        [
          FileCategory.IMAGE,
          FileCategory.VIDEO,
          FileCategory.AUDIO,
          FileCategory.PDF,
          FileCategory.ARCHIVE,
          FileCategory.DOCX,
          FileCategory.XLSX,
        ].includes(category)
      ) {
        try {
          arrayBuffer = await dataDeBase64Mapper(rawContent, 'Image')
        } catch (e) {
          try {
            const bin = atob(rawContent)
            arrayBuffer = binaryStringToUint8Array(bin).buffer
          } catch (err) {
            arrayBuffer = new TextEncoder().encode(rawContent).buffer
          }
        }
      }
    }
  }

  if (arrayBuffer && arrayBuffer.byteLength >= 4) {
    const headerBytes = new Uint8Array(arrayBuffer.slice(0, 4))
    const isZip =
      headerBytes[0] === 0x50 &&
      headerBytes[1] === 0x4b &&
      headerBytes[2] === 0x03 &&
      headerBytes[3] === 0x04

    if (isZip) {
      try {
        const testZip = await JSZip.loadAsync(
          arrayBuffer.slice(0, Math.min(arrayBuffer.byteLength, 65536))
        )
        if (testZip.file('word/document.xml')) {
          category = FileCategory.DOCX
        } else if (testZip.file('xl/workbook.xml')) {
          category = FileCategory.XLSX
        }
      } catch (e) {}
    } else {
      const isOle =
        headerBytes[0] === 0xd0 &&
        headerBytes[1] === 0xcf &&
        headerBytes[2] === 0x11 &&
        headerBytes[3] === 0xe0
      if (isOle) {
        const ext = realName.split('.').pop()?.toLowerCase() || ''
        if (ext === 'xls' || ext === 'csv') {
          category = FileCategory.XLSX
        } else if (ext === 'doc') {
          category = FileCategory.DOCX
        }
      }
    }
  }

  const result = {
    category,
    name: realName,
    size: arrayBuffer
      ? arrayBuffer.byteLength
      : typeof rawContent === 'string'
        ? rawContent.length
        : 0,
    url: null,
    text: '',
    htmlContent: '',
    arrayBuffer: arrayBuffer,
    zipEntries: [],
    hexBytes: [],
  }

  if (category === FileCategory.PDF) {
    if (arrayBuffer) {
      const blob = new Blob([arrayBuffer], {type: 'application/pdf'})
      result.url = URL.createObjectURL(blob)
    }
  } else if ([FileCategory.IMAGE, FileCategory.VIDEO, FileCategory.AUDIO].includes(category)) {
    if (arrayBuffer) {
      const blob = new Blob([arrayBuffer], {type: mimeType || 'application/octet-stream'})
      result.url = URL.createObjectURL(blob)
    }
  } else if (category === FileCategory.DOCX) {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      try {
        arrayBuffer = await createEmptyDocxArrayBuffer()
        result.size = arrayBuffer.byteLength
        result.arrayBuffer = arrayBuffer
      } catch (e) {}
    } else {
      result.arrayBuffer = arrayBuffer
    }
  } else if (category === FileCategory.XLSX) {
    result.arrayBuffer = arrayBuffer
  } else if (category === FileCategory.ARCHIVE) {
    if (arrayBuffer) {
      const zip = await JSZip.loadAsync(arrayBuffer)
      const list = []
      zip.forEach((path, entry) => {
        list.push({
          path,
          dir: entry.dir,
          size: entry._data?.uncompressedSize || 0,
        })
      })
      result.zipEntries = list
    }
  } else if (category === FileCategory.HTML) {
    if (typeof rawContent === 'string' && !rawContent.startsWith('data:')) {
      result.text = rawContent
    } else if (arrayBuffer) {
      result.text = new TextDecoder('utf-8').decode(arrayBuffer)
    }
    result.htmlContent = result.text
  } else if ([FileCategory.CODE, FileCategory.MARKDOWN, FileCategory.JSON].includes(category)) {
    if (typeof rawContent === 'string' && !rawContent.startsWith('data:')) {
      result.text = rawContent
    } else if (arrayBuffer) {
      result.text = new TextDecoder('utf-8').decode(arrayBuffer)
    }
    if (category === FileCategory.JSON) {
      try {
        result.text = JSON.stringify(JSON.parse(result.text), null, 2)
      } catch (e) {}
    }
  } else {
    result.category = FileCategory.HEX
    if (arrayBuffer) {
      result.hexBytes = Array.from(new Uint8Array(arrayBuffer.slice(0, 2048)))
    } else if (typeof rawContent === 'string') {
      result.hexBytes = Array.from(new TextEncoder().encode(rawContent).slice(0, 2048))
    }
  }

  return result
}

export async function serializeForSave(modifiedText, mode) {
  if (mode === 'virtual') {
    return modifiedText
  }
  if (mode === 'local') {
    return new Blob([modifiedText], {type: 'text/plain;charset=utf-8'})
  }
  return modifiedText
}

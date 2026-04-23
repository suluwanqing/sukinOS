import React, { useState, useMemo } from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import DnsIcon from '@mui/icons-material/Dns';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import CodeIcon from '@mui/icons-material/Code';
const bem = createNamespace('store-helper');
const codeUpload = `@appManage.post('/upload')
async def sukinOS_upload(
        file: UploadFile = File(...),
        userId: int = Form(...),
        appName: str = Form(...),
        metaInfo: str = Form(...),
        resourceId: str = Form(...),
        user: User = Depends(verify_auth()),
        db: Session = Depends(get_db),
):
    # 鉴权与服务限制校验
    if not (userId == 1 and int(user.id) == 1):
        return api_response(code=200, msg="服务限制,暂不提供!")
    try:
        # 1. 大小限制校验 (最大 10MB)
        file.file.seek(0, 2)
        file_size = file.file.tell()
        await file.seek(0)
        if file_size > APP_FILE_MAX_SIZE:
            return api_response(code=400, msg="文件大小超过限制")

        # 2. 文件重命名与物理存储
        original_filename = file.filename
        extension = os.path.splitext(original_filename)[1] or ".bin"
        new_filename = f"{uuid.uuid4()}{extension}"
        save_path = os.path.join(APP_FILE_DIR, new_filename)

        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 3. 数据库记录持久化
        file_url = f"{APP_FILE__GET}{new_filename}"
        data = {
            "file_name": new_filename,
            "url": file_url,
            "size": file_size,
            "app_name": appName,
            "user_id": userId,
            "meta_info": json.loads(metaInfo),
            "resource_id": resourceId
        }
        db.add(Sukinos_App(**D_sukinos_App(**data).model_dump()))
        db.commit()
        return api_response(code=200, msg="上传成功", data=data)
    except Exception as e:
        return api_response(code=500, msg=f"上传失败: {str(e)}")`;

const codeDownloadList = `@appManage.get('/download/{fileName}')
async def sukinOS_download(fileName: str = Path(..., description="资源文件名")):
    try:
        secure_filename = os.path.basename(fileName)
        file_path = os.path.join(APP_FILE_DIR, secure_filename)
        if not os.path.exists(file_path):
            return api_response(code=404, msg="文件不存在")
        with open(file_path, "rb") as f:
            file_content = f.read()
        return api_response(
            code=200,
            msg="获取成功",
            data=file_content,
            media_type="application/javascript"
        )
    except Exception as e:
        return api_response(code=500, msg=str(e))

@appManage.get('/appList')
async def get_app_list(
    current: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    try:
        offset = (current - 1) * pageSize
        total_count = db.query(Sukinos_App).count()
        datas = db.query(Sukinos_App).offset(offset).limit(pageSize).all()
        result = {
            "items": datas,
            "pagination": {
                "current_page": current,
                "total_pages": (total_count + pageSize - 1) // pageSize,
                "total_items": total_count,
                "page_size": pageSize
            }
        }
        return api_response(code=200, msg="获取成功", data=result)
    except Exception as e:
        return api_response(code=500, msg=str(e))`;

const codeUpdateSearch = `@appManage.post('/checkUpdates')
async def check_updates(request: Request, db: Session = Depends(get_db)):
    try:
        payload = await request.json()
        apps_to_check = payload if isinstance(payload, list) else payload.get("apps", [])
        update_needed = []
        for item in apps_to_check:
            r_id, l_ver = item.get("resourceId"), item.get("localVersion")
            if not r_id: continue
            db_app = db.query(Sukinos_App).filter(Sukinos_App.resource_id == r_id).first()
            if db_app:
                # 尝试浮点数比对，失败则回退到字符串比对
                try:
                    if float(db_app.version) > float(l_ver):
                        update_needed.append(db_app)
                except:
                    if str(db_app.version) > str(l_ver):
                        update_needed.append(db_app)
        return api_response(code=200, msg="检查成功", data=update_needed)
    except Exception as e:
        return api_response(code=500, msg="服务器错误: " + str(e))

@appManage.get('/searchApp')
async def search_app(keyword: str = Query(...), db: Session = Depends(get_db)):
    try:
        data = db.query(Sukinos_App).filter(Sukinos_App.app_name.like(keyword)).all()
        return api_response(code=200, msg="获取成功", data=data)
    except Exception as e:
        return api_response(code=500, msg="服务器错误: " + str(e))`;

const codeManage = `@appManage.get('/myUpload')
async def user_uploads(user: User = Depends(verify_auth()), db: Session = Depends(get_db)):
    try:
        data = db.query(Sukinos_App).filter_by(user_id=user.id).all()
        return api_response(code=200, msg="获取成功", data=data)
    except Exception as e:
        return api_response(code=500, msg="服务器错误: " + str(e))

@appManage.post('/delete')
async def user_delete(
    resourceId: str = Query(...),
    user: User = Depends(verify_auth()),
    db: Session = Depends(get_db)
):
    try:
        data = db.query(Sukinos_App).filter_by(user_id=user.id, resource_id=resourceId).first()
        if data:
            db.delete(data)
            db.commit()
            return api_response(code=200, msg="删除成功")
        return api_response(code=404, msg="找不到对应资源或无权限删除")
    except Exception as e:
        return api_response(code=500, msg="服务器错误: " + str(e))`;

// --- UI 渲染组件 ---

const IntroSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>自定义源接口规范</h2>
    <p className={style[bem.e('text')]}>
      SukinOS 允许开发者部署私有应用商店后端。如果您希望搭建自己的软件源，
      只需实现本手册中定义的标准 RESTful API 接口，并在前端“商店设置”中配置接口地址即可。
    </p>
    <div className={style[bem.e('highlight')]}>
      <h4 className={style[bem.e('subtitle')]}>通用约定</h4>
      <ul className={style[bem.e('list')]}>
        <li><strong>响应格式:</strong> 所有非文件流接口均返回 JSON，需包含 <code>code</code>, <code>message</code> (或 <code>msg</code>), <code>data</code>。</li>
        <li><strong>鉴权:</strong> 私有操作（如上传、删除、我的上传）必须携带有效身份 Token。</li>
      </ul>
    </div>
  </div>
)

const UploadSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>应用发布 (Upload API)</h2>
    <p className={style[bem.e('text')]}>用于开发者发布新应用或更新现有应用版本。</p>
    <ul className={style[bem.e('list')]}>
      <li><strong>Method:</strong> <code>POST</code></li>
      <li><strong>Path:</strong> <code>/upload</code></li>
      <li><strong>Content-Type:</strong> <code>multipart/form-data</code></li>
    </ul>
    <h4 className={style[bem.e('subtitle')]}>参考实现</h4>
    <pre className={style[bem.e('code')]}>{codeUpload}</pre>
  </div>
)

const ListDownloadSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>获取与下载 (List & Download)</h2>
    <h4 className={style[bem.e('subtitle')]}>1. 应用列表 (GET /appList)</h4>
    <p className={style[bem.e('text')]}>Query 参数: <code>current</code> (当前页), <code>pageSize</code> (页长)。</p>

    <h4 className={style[bem.e('subtitle')]}>2. 资源下载 (GET /download/{"{fileName}"})</h4>
    <p className={style[bem.e('text')]}>直接返回应用 <code>.js</code> 或 <code>.bin</code> 文件流。</p>

    <h4 className={style[bem.e('subtitle')]}>参考实现</h4>
    <pre className={style[bem.e('code')]}>{codeDownloadList}</pre>
  </div>
)

const UpdateSearchSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>更新与搜索 (Update & Search)</h2>
    <h4 className={style[bem.e('subtitle')]}>1. 检查更新 (POST /checkUpdates)</h4>
    <p className={style[bem.e('text')]}>Body 为已安装应用的 <code>resourceId</code> 与 <code>localVersion</code> 列表。</p>

    <h4 className={style[bem.e('subtitle')]}>2. 搜索应用 (GET /searchApp)</h4>
    <p className={style[bem.e('text')]}>参数: <code>keyword</code> (Query)。执行模糊匹配逻辑。</p>

    <h4 className={style[bem.e('subtitle')]}>参考实现</h4>
    <pre className={style[bem.e('code')]}>{codeUpdateSearch}</pre>
  </div>
)

const ManageSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>个人管理 (My Apps & Delete)</h2>
    <h4 className={style[bem.e('subtitle')]}>1. 我的上传 (GET /myUpload)</h4>
    <p className={style[bem.e('text')]}>返回当前登录用户上传的所有应用记录。</p>

    <h4 className={style[bem.e('subtitle')]}>2. 删除应用 (POST /delete)</h4>
    <p className={style[bem.e('text')]}>Query 参数: <code>resourceId</code>。必须验证 user_id 权限。</p>

    <h4 className={style[bem.e('subtitle')]}>参考实现</h4>
    <pre className={style[bem.e('code')]}>{codeManage}</pre>
  </div>
)

const ParseSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>定制化解析思想</h2>
    <p className={style[bem.e('text')]}>由于应用解析强定制化，开发者可以根据需要对内核解析函数进行增强：</p>
    <ul className={style[bem.e('list')]}>
      <li><strong>权限管理：</strong> 根据不同源执行不同代码片段，实现多级权限。</li>
      <li><strong>沙箱环境：</strong> 使用 WASM 或 Iframe 隔离执行环境。</li>
      <li><strong>App 自解析：</strong> 将解析函数注入对应生命周期实现动态渲染。</li>
    </ul>
  </div>
)

const docSections = [
  { id: 'intro', label: '接口概览', icon: <DnsIcon />, component: IntroSection },
  { id: 'upload', label: '发布接口', icon: <CloudUploadIcon />, component: UploadSection },
  { id: 'list', label: '下载/列表', icon: <CloudDownloadIcon />, component: ListDownloadSection },
  { id: 'update', label: '更新/搜索', icon: <SystemUpdateAltIcon />, component: UpdateSearchSection },
  { id: 'manage', label: '管理接口', icon: <ManageAccountsIcon />, component: ManageSection },
  { id: 'parse', label: '解析说明', icon: <CodeIcon />, component: ParseSection }
];

const StoreHelper = () => {
  const [activeTabId, setActiveTabId] = useState('intro');

  const ActiveComponent = useMemo(() =>
    docSections.find(s => s.id === activeTabId)?.component || IntroSection,
  [activeTabId]);

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('sidebar')]}>
        <div className={style[bem.e('header')]}>
          <h3>源 API 手册</h3>
        </div>
        <div className={style[bem.e('nav')]}>
          {docSections.map(item => (
            <div
              key={item.id}
              className={[
                style[bem.e('nav-item')],
                style[bem.is('active', activeTabId === item.id)]
              ].join(' ')}
              onClick={() => setActiveTabId(item.id)}
            >
              <span className={style[bem.e('nav-icon')]}>{item.icon}</span>
              <span className={style[bem.e('nav-label')]}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={style[bem.e('content')]}>
        <ActiveComponent />
      </div>
    </div>
  );
}

export default StoreHelper;

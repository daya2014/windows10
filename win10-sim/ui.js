// 文件资源管理器
function renderTree(){
  let html = "";
  //快速访问
  html += `<div class="tree-item tree-fold">★ 快速访问</div>`;
  sys.fs.quickAccess.forEach(item=>{
    html += `<div class="tree-item tree-indent">📄 ${item.name}</div>`;
  })
  //云盘
  html += `<div class="tree-item tree-fold">☁ WPS云盘</div>`;
  html += `<div class="tree-item tree-fold">☁ OneDrive</div>`;
  //此电脑
  html += `<div class="tree-item tree-fold">💻 此电脑</div>`;
  sys.fs.drives.forEach(d=>{
    let arrow = d.expanded ? "▼" : "▶";
    html += `<div class="tree-item tree-indent" onclick="toggleDrive('${d.name}')">${arrow} 💿 ${d.name}</div>`;
    if(d.expanded){
      d.children.forEach(child=>{
        html += `<div class="tree-item tree-indent" onclick="openFolderInExplorer('${child.name}')">📁 ${child.name}</div>`;
      })
    }
  })
  //网络
  html += `<div class="tree-item tree-fold">🌐 网络</div>`;
  return html;
}
function toggleDrive(driveName){
  const drive = sys.fs.drives.find(d=>d.name===driveName);
  if(drive){
    drive.expanded = !drive.expanded;
    refreshExplorer();
  }
}
function toggleTreeItem(name){
  function findNode(n,target){
    if(n.name === target) return n;
    if(n.children){
      for(let c of n.children){
        const r = findNode(c,target);
        if(r) return r;
      }
    }
    return null;
  }
  const nd = findNode(sys.fs,name);
  if(nd){
    nd.expanded = !nd.expanded;
    refreshExplorer();
  }
}
let explorerWinId = null;
function openThisPC(){
  explorerWinId = createWindow("此电脑",`
    <div class="explorer-wrap">
      <input class="address-bar" value="此电脑">
      <div class="explorer-main">
        <div class="tree-panel" id="treePanel"></div>
        <div class="file-list-panel" id="fileListPanel"></div>
      </div>
    </div>
  `)
  refreshExplorer();
}
function openFolderInExplorer(folderName){
  sys.currentExplorerFolder = folderName;
  refreshExplorer();
}
function refreshExplorer(){
  const treePanel = document.querySelector("#treePanel");
  const fileListPanel = document.querySelector("#fileListPanel");
  if(!treePanel || !fileListPanel) return;
  treePanel.innerHTML = renderTree();
  let fileHtml = "";
  //文件夹列表
  const cDrive = sys.fs.drives[0];
  cDrive.children.forEach(folder=>{
    fileHtml += `<div class="file-item">📁 ${folder.name}</div>`
  })
  //C盘磁盘项 + 容量条
  const usedBytes = cDrive.totalBytes - cDrive.freeBytes;
  const totalGB = bytesToGB(cDrive.totalBytes);
  const freeGB = bytesToGB(cDrive.freeBytes);
  const percent = (usedBytes / cDrive.totalBytes *100).toFixed(1);
  fileHtml += `
  <div class="file-item">
    <div style="display:flex;align-items:center;gap:10px;">
      <span>💿 ${cDrive.name}</span>
    </div>
    <div style="width:100%;height:22px;background:#ddd;border-radius:3px;margin:4px 0;">
      <div style="width:${percent}%;height:100%;background:#0078d4;border-radius:3px;"></div>
    </div>
    <span>${freeGB.toFixed(1)} GB 可用，共 ${totalGB.toFixed(0)} GB</span>
  </div>
  `;
  fileListPanel.innerHTML = fileHtml;
}

//记事本
function openNotepad(file=null){
  let content = file ? file.content : "";
  let name = file ? file.name : "无标题 - 记事本";
  createWindow(name,`
    <textarea id="noteText">${content}</textarea>
    <br>
    <button onclick="saveNote(${file?.id??0})">保存</button>
    <button onclick="saveAsNote()">另存为</button>
  `)
}
// 保存已有文件
function saveNote(fileId){
  const text = $("#noteText").value;
  const targetFile = sys.desktopItems.find(f=>f.id === fileId);
  const encoder = new TextEncoder();
  const byteLen = encoder.encode(text).length;
  if(targetFile){
    // 更新文件内容，旧空间释放，重新占用
    const oldByteLen = encoder.encode(targetFile.content).length;
    deleteFileFromDisk(oldByteLen);
    if(createFileOnDisk(byteLen)){
      targetFile.content = text;
      targetFile.mtime = Date.now();
      alert("保存成功");
    }
  }else{
    alert("文件不存在，请点另存为");
  }
}
// 另存为新建文件
function saveAsNote(){
  const text = $("#noteText").value;
  const fn = prompt("另存为文件名：","文档.txt");
  if(!fn) return;
  const id = Date.now();
  const encoder = new TextEncoder();
  const byteLen = encoder.encode(text).length;
  if(createFileOnDisk(byteLen)){
    sys.desktopItems.push({id,name:fn,type:"txt",content:text,mtime:Date.now()});
    renderDesktop();
    alert("另存成功");
  }
}

//任务管理器
function openTaskManager(){
  let html = `<table><tr><th>进程</th><th>内存占用</th><th>操作</th></tr>`;
  sys.windows.forEach((w,i)=>{
    html += `<tr><td>窗口${i+1}</td><td>2GB</td><td><button onclick="closeWin(${w.winId})">结束任务</button></tr>`
  })
  html += `</table>`;
  createWindow("任务管理器",html);
}

//回收站
function openRecycleBin(){
  let html = `<p>回收站项目数量：${sys.recycleBin.length}</p>`;
  sys.recycleBin.forEach((item,i)=>{
    html += `<div>${item.name} <button onclick="restoreItem(${i})">还原</button></div>`
  })
  html += `<br><button onclick="emptyRecycle()">清空回收站</button>`;
  createWindow("回收站",html);
}
function restoreItem(idx){
  const item = sys.recycleBin[idx];
  item.mtime = Date.now();
  // 还原txt文件占用空间
  if(item.type === "txt"){
    const encoder = new TextEncoder();
    const byteLen = encoder.encode(item.content).length;
    createFileOnDisk(byteLen);
  }
  sys.desktopItems.push(item);
  sys.recycleBin.splice(idx,1);
  renderDesktop();
  alert("文件已还原到桌面");
}
function emptyRecycle(){
  sys.recycleBin.forEach(item=>{
    if(item.type === "txt"){
      const encoder = new TextEncoder();
      const byteLen = encoder.encode(item.content).length;
      deleteFileFromDisk(byteLen);
    }
  })
  sys.recycleBin=[];
  renderDesktop();
  alert("回收站已清空")
}

//设置
function openSettings(){
  createWindow("设置",`
    <p>系统设置</p>
    <p>内存上限：${sys.ramTotal}GB</p>
    <p>当前占用：${sys.ramUsed}GB</p>
  `)
}
function openPersonalize(){
  createWindow("个性化",`
    <p>桌面背景设置</p>
    <p>模拟器当前壁纸：Win10 蓝色渐变壁纸</p>
  `)
}

//微信
function openWechat(){
  let contactHtml = "";
  sys.wechatChats.forEach((c,idx)=>{
    contactHtml += `<div class="im-contact-item" onclick="renderWechatChat(${idx})">${c.name}</div>`
  })
  createWindow("微信",`
    <div class="im-container">
      <div class="im-sidebar">${contactHtml}</div>
      <div class="im-chat-area">
        <div class="im-chat-content" id="wechatChatBox"></div>
        <div class="im-input-area">
          <textarea id="wechatInput"></textarea>
          <br>
          <button onclick="sendWechatMsg()">发送</button>
        </div>
      </div>
    </div>
  `)
  renderWechatChat(0);
}
function renderWechatChat(idx){
  const chat = sys.wechatChats[idx];
  let msgHtml = "";
  chat.msgList.forEach(m=>{
    msgHtml += `<div class="msg-${m.who}"><span class="msg-bubble">${m.text}</span></div>`
  })
  $("#wechatChatBox").innerHTML = msgHtml;
  $("#wechatChatBox").scrollTop = $("#wechatChatBox").scrollHeight;
  window.wechatCurrentChatIdx = idx;
}
function sendWechatMsg(){
  const txt = $("#wechatInput").value.trim();
  if(!txt) return;
  sys.wechatChats[window.wechatCurrentChatIdx].msgList.push({who:"self",text:txt});
  $("#wechatInput").value="";
  renderWechatChat(window.wechatCurrentChatIdx);
}

//QQ
function openQQ(){
  let contactHtml = "";
  sys.qqChats.forEach((c,idx)=>{
    contactHtml += `<div class="im-contact-item" onclick="renderQQChat(${idx})">${c.name}</div>`
  })
  createWindow("QQ",`
    <div class="im-container">
      <div class="im-sidebar">${contactHtml}</div>
      <div class="im-chat-area">
        <div class="im-chat-content" id="qqChatBox"></div>
        <div class="im-input-area">
          <textarea id="qqInput"></textarea>
          <br>
          <button onclick="sendQQMsg()">发送</button>
        </div>
      </div>
    </div>
  `)
  renderQQChat(0);
}
function renderQQChat(idx){
  const chat = sys.qqChats[idx];
  let msgHtml = "";
  chat.msgList.forEach(m=>{
    msgHtml += `<div class="msg-${m.who}"><span class="msg-bubble">${m.text}</span></div>`
  })
  $("#qqChatBox").innerHTML = msgHtml;
  $("#qqChatBox").scrollTop = $("#qqChatBox").scrollHeight;
  window.qqCurrentChatIdx = idx;
}
function sendQQMsg(){
  const txt = $("#qqInput").value.trim();
  if(!txt) return;
  sys.qqChats[window.qqCurrentChatIdx].msgList.push({who:"self",text:txt});
  $("#qqInput").value="";
  renderQQChat(window.qqCurrentChatIdx);
}

//企业微信
function openWeCom(){
  let contactHtml = "";
  sys.wecomChats.forEach((c,idx)=>{
    contactHtml += `<div class="im-contact-item" onclick="renderWeComChat(${idx})">${c.name}</div>`
  })
  createWindow("企业微信",`
    <div class="im-container">
      <div class="im-sidebar">${contactHtml}</div>
      <div class="im-chat-area">
        <div class="im-chat-content" id="wecomChatBox"></div>
        <div class="im-input-area">
          <textarea id="wecomInput"></textarea>
          <br>
          <button onclick="sendWeComMsg()">发送</button>
        </div>
      </div>
    </div>
  `)
  renderWeComChat(0);
}
function renderWeComChat(idx){
  const chat = sys.wecomChats[idx];
  let msgHtml = "";
  chat.msgList.forEach(m=>{
    msgHtml += `<div class="msg-${m.who}"><span class="msg-bubble">${m.text}</span></div>`
  })
  $("#wecomChatBox").innerHTML = msgHtml;
  $("#wecomChatBox").scrollTop = $("#wecomChatBox").scrollHeight;
  window.wecomCurrentChatIdx = idx;
}
function sendWeComMsg(){
  const txt = $("#wecomInput").value.trim();
  if(!txt) return;
  sys.wecomChats[window.wecomCurrentChatIdx].msgList.push({who:"self",text:txt});
  $("#wecomInput").value="";
  renderWeComChat(window.wecomCurrentChatIdx);
}

//飞书
function openLark(){
  let contactHtml = "";
  sys.larkChats.forEach((c,idx)=>{
    contactHtml += `<div class="im-contact-item" onclick="renderLarkChat(${idx})">${c.name}</div>`
  })
  createWindow("飞书",`
    <div class="im-container">
      <div class="im-sidebar">${contactHtml}</div>
      <div class="im-chat-area">
        <div class="im-chat-content" id="larkChatBox"></div>
        <div class="im-input-area">
          <textarea id="larkInput"></textarea>
          <br>
          <button onclick="sendLarkMsg()">发送</button>
        </div>
      </div>
    </div>
  `)
  renderLarkChat(0);
}
function renderLarkChat(idx){
  const chat = sys.larkChats[idx];
  let msgHtml = "";
  chat.msgList.forEach(m=>{
    msgHtml += `<div class="msg-${m.who}"><span class="msg-bubble">${m.text}</span></div>`
  })
  $("#larkChatBox").innerHTML = msgHtml;
  $("#larkChatBox").scrollTop = $("#larkChatBox").scrollHeight;
  window.larkCurrentChatIdx = idx;
}
function sendLarkMsg(){
  const txt = $("#larkInput").value.trim();
  if(!txt) return;
  sys.larkChats[window.larkCurrentChatIdx].msgList.push({who:"self",text:txt});
  $("#larkInput").value="";
  renderLarkChat(window.larkCurrentChatIdx);
}

//浏览器
function openBrowser(){
  createWindow("浏览器",`
    <div class="browser-wrap">
      <div class="browser-topbar">
        <button onclick="browserBack()">←</button>
        <button onclick="browserForward()">→</button>
        <button onclick="browserReload()">↻</button>
        <input class="browser-url" id="browserUrl" value="${sys.browserUrl}"/>
        <button onclick="browserGo()">前往</button>
      </div>
      <div class="browser-page" id="browserPage">
        <h3>模拟器浏览器</h3>
        <p>输入网址点前往，这里是模拟页面，不会真实联网。</p>
      </div>
    </div>
  `)
}
function browserGo(){
  const url = $("#browserUrl").value;
  sys.browserUrl = url;
  $("#browserPage").innerHTML = `<h3>访问：${url}</h3><p>模拟页面加载成功。</p>`;
}
function browserReload(){
  $("#browserPage").innerHTML = `<h3>页面已刷新</h3><p>地址：${sys.browserUrl}</p>`;
}
function browserBack(){
  $("#browserPage").innerHTML = `<p>← 返回上一页（模拟）</p>`;
}
function browserForward(){
  $("#browserPage").innerHTML = `<p>→ 前进下一页（模拟）</p>`;
}

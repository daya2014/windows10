const $ = s=>document.querySelector(s);
// ===== Windows二进制1024存储换算，簇4KB =====
function bytesToGB(bytes) {
  return bytes / (1024 * 1024 * 1024);
}
function gbToBytes(gb) {
  return gb * 1024 * 1024 * 1024;
}
const CLUSTER_SIZE = 4096; // Windows默认4KB簇
// 按簇向上取整，计算文件真实磁盘占用
function getFileDiskOccupiedSize(fileByteSize) {
  if(fileByteSize === 0) return CLUSTER_SIZE;
  const clusterCount = Math.ceil(fileByteSize / CLUSTER_SIZE);
  return clusterCount * CLUSTER_SIZE;
}
// C盘全局容量
const C_TOTAL_BYTES = gbToBytes(112);
let cFreeBytes = gbToBytes(15.1);
let sys = {
  powerOn:false,
  ramTotal:16,
  ramUsed:0,
  desktopItems:[],
  recycleBin:[],
  windows:[],
  nextWinZ:11,
  clipboard:null,
  clipboardOp:"",
  selectedIcons:[],
  currentExplorerFolder:null,
   fs:{
    quickAccess:[
      {name:"桌面",type:"quick"},
      {name:"下载",type:"quick"},
      {name:"文档",type:"quick"},
      {name:"图片",type:"quick"},
    ],
        drives:[
      {
        name:"BOOTCAMP (C:)",
        type:"disk",
        totalBytes:C_TOTAL_BYTES,
        freeBytes:cFreeBytes,
        expanded:false,
        children:[
          {name:"3D 对象",type:"folder",children:[]},
          {name:"视频",type:"folder",children:[]},
          {name:"图片",type:"folder",children:[]},
          {name:"文档",type:"folder",children:[]},
          {name:"下载",type:"folder",children:[]},
          {name:"音乐",type:"folder",children:[]},
          {name:"桌面",type:"folder",children:[]}
        ]
      }
    ],
    cloud:[
      {name:"WPS云盘",type:"cloud"},
      {name:"OneDrive",type:"cloud"}
    ]
  },
  wechatChats:[
    {name:"文件传输助手",msgList:[{who:"other",text:"你好，微信模拟器已就绪"}]},
    {name:"好友A",msgList:[{who:"other",text:"今天有空吗？"}]}
  ],
  qqChats:[
    {name:"我的设备",msgList:[{who:"other",text:"QQ模拟器启动成功"}]},
    {name:"班级群",msgList:[{who:"other",text:"作业记得提交"}]}
  ],
  wecomChats:[
    {name:"同事小张",msgList:[{who:"other",text:"下午开会"}]},
    {name:"公司大群",msgList:[{who:"other",text:"通知：本周五团建"}]}
  ],
  larkChats:[
    {name:"项目组",msgList:[{who:"other",text:"文档更新了，请查看"}]},
    {name:"行政",msgList:[{who:"other",text:"打卡提醒"}]}
  ],
  browserUrl:"https://example.com"
};
// 全部内置SVG图标，无外部图片
const svgIcons = {
pc:`<svg viewBox="0 0 48 48"><rect fill="#0078d4" rx="4" width="48" height="48" /><path fill="#fff" d="M12 16h24v16H12z M16 36h16v4H16z" /></svg>`,
recycleEmpty:`<svg viewBox="0 0 48 48"><rect fill="#4488dd" rx="6" width="48" height="48" /><path fill="#fff" d="M14 12h20v4H14zM16 18h16l-2 20H18z" /></svg>`,
recycleFull:`<svg viewBox="0 0 48 48"><rect fill="#4488dd" rx="6" width="48" height="48" /><path fill="#fff" d="M14 12h20v4H14zM16 18h16l-2 20H18z" /><circle cx="20" cy="26" r="4" fill="#2277dd" /><circle cx="28" cy="26" r="4" fill="#2277dd" /><circle cx="20" cy="34" r="4" fill="#2277dd" /></svg>`,
wechat:`<svg viewBox="0 0 48 48"><circle fill="#07c160" cx="24" cy="24" r="22" /><circle fill="#fff" cx="16" cy="18" r="3" /><circle fill="#fff" cx="32" cy="18" r="3" /><circle fill="#fff" cx="14" cy="30" r="3" /><circle fill="#fff" cx="34" cy="30" r="3" /></svg>`,
qq:`<svg viewBox="0 0 48 48"><circle fill="#12b7f5" cx="24" cy="24" r="22" /><ellipse fill="#fff" cx="24" cy="18" rx="12" ry="10" /><circle fill="#000" cx="18" cy="17" r="2" /><circle fill="#000" cx="30" cy="17" r="2" /><path fill="#ff6644" d="M14 26h20l-2 6H16z" /></svg>`,
wecom:`<svg viewBox="0 0 48 48"><rect fill="#eeeeee" rx="8" width="48" height="48" /><rect fill="#07c160" x="8" y="8" width="32" height="32" rx="6" /></svg>`,
lark:`<svg viewBox="0 0 48 48"><defs><linearGradient id="lk" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7149ff" /><stop offset="100%" stop-color="#22b8cf" /></linearGradient></defs><rect fill="url(#lk)" rx="8" width="48" height="48" /><circle fill="#fff" cx="24" cy="24" r="12" /></svg>`,
browser:`<svg viewBox="0 0 48 48"><circle fill="#ffffff" cx="24" cy="24" r="22" /><circle stroke="#4285f4" stroke-width="3" cx="24" cy="24" r="16" /><circle fill="#4285f4" cx="24" cy="24" r="8" /></svg>`,
txt:`<svg viewBox="0 0 48 48"><rect fill="#1971c2" rx="4" width="48" height="48" /></svg>`,
folder:`<svg viewBox="0 0 48 48"><rect fill="#fd7e14" rx="4" width="48" height="48" /></svg>`
};
// 创建文件，占用磁盘
function createFileOnDisk(fileByteSize){
  const occupyBytes = getFileDiskOccupiedSize(fileByteSize);
  if(cFreeBytes >= occupyBytes){
    cFreeBytes -= occupyBytes;
    sys.fs.drives[0].freeBytes = cFreeBytes;
    refreshExplorer();
    return true;
  }else{
    alert("磁盘空间不足！");
    return false;
  }
}
// 删除文件，归还磁盘空间
function deleteFileFromDisk(fileByteSize){
  const occupyBytes = getFileDiskOccupiedSize(fileByteSize);
  cFreeBytes += occupyBytes;
  sys.fs.drives[0].freeBytes = cFreeBytes;
  refreshExplorer();
}
// 开机点击
$("#monitor").onclick = function(){
  if(!sys.powerOn){
    sys.powerOn=true;
    $("#win10").style.display="block";
    $("#monitor").classList.remove("screen-off");
    initDesktop();
    startClock();
    updateRAM();
    initBoxSelect();
  }
}
function shutdown(){
  sys.powerOn=false;
  $("#win10").style.display="none";
  $("#monitor").classList.add("screen-off");
  $("#startMenu").style.display="none";
}
function restart(){
  shutdown();
  setTimeout(()=>{
    sys.powerOn=true;
    $("#win10").style.display="block";
    $("#monitor").classList.remove("screen-off");
    initDesktop();
    updateRAM();
  },800)
}
function toggleStartMenu(){
  const sm = $("#startMenu");
  sm.style.display = sm.style.display==="block" ? "none":"block";
}
function startClock(){
  setInterval(()=>{
    const d = new Date();
    $("#clock").innerText = d.toLocaleTimeString();
  },1000)
}
function updateRAM(){
  sys.ramUsed = sys.windows.length * 2;
  if(sys.ramUsed>sys.ramTotal) sys.ramUsed=sys.ramTotal;
  $("#ramDisplay").innerText = sys.ramUsed;
  if(sys.ramUsed>=16) alert("警告：内存已满，系统卡顿！");
  renderTaskbarWindows();
}

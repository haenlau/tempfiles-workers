// ====== HTML 页面 ======
const HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>临时文件分享</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; }
    h1 { text-align: center; }
    input, button { width: 100%; padding: 12px; margin: 10px 0; box-sizing: border-box; border: 1px solid #ccc; border-radius: 6px; }
    button { background: #007bff; color: white; border: none; cursor: pointer; }
    button:hover { background: #0069d9; }
    #result { margin-top: 15px; padding: 12px; background: #e8f4ff; border-radius: 6px; word-break: break-all; }
    a { color: #007bff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>📁 临时文件上传</h1>
  <input type="file" id="fileInput" />
  <button onclick="upload()">上传（≤25MB）</button>
  <div id="result"></div>
  <p style="text-align:center;color:#666;font-size:14px;">文件 12 小时后自动删除</p>

  <script>
    async function upload() {
      const file = document.getElementById('fileInput').files[0];
      if (!file) return alert("请选择文件");
      if (file.size > 26112000) return alert("文件不能超过 25MB");

      const formData = new FormData();
      formData.append("file", file);
      const btn = document.querySelector('button');
      btn.disabled = true;
      btn.textContent = "上传中…";

      try {
        const res = await fetch("/api/upload-public", { method: "POST", body: formData });
        const data = await res.json();
        const el = document.getElementById('result');
        if (res.ok && data.downloadUrl) {
          el.innerHTML = '<strong>✅ 分享链接：</strong><br><a href="' + data.downloadUrl + '" target="_blank">' + data.downloadUrl + '</a>';
        } else {
          el.innerText = "❌ " + (data.error || "上传失败");
        }
      } catch (e) {
        document.getElementById('result').innerText = "网络错误：" + e.message;
      } finally {
        btn.disabled = false;
        btn.textContent = "上传（≤25MB）";
      }
    }
  </script>
</body>
</html>
`;

// ====== 工具函数 ======
function generateFileId() {
  return Math.random().toString(36).substring(2, 8); // 6字符随机ID
}

// ====== 处理文件上传 ======
async function handleFileUpload(file, env) {
  const MAX_SIZE = 26112000; // 25 MB
  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: "文件不能超过 25MB" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const fileId = generateFileId();
  const arrayBuffer = await file.arrayBuffer();

  await env.TEMP_STORE.put(fileId, arrayBuffer, {
    metadata: {
      filename: file.name || "file",
      contentType: file.type || "application/octet-stream"
    },
    expirationTtl: 43200 // 12小时 = 43200秒
  });

  // ⚠️ 部署时请将 <your-domain> 替换为实际域名（如 your-worker.workers.dev 或 tmp.example.com）
  const downloadUrl = `https://<your-domain>/${fileId}`;

  return new Response(JSON.stringify({ downloadUrl }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// ====== 主入口 ======
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // 1. 首页
    if (pathname === "/") {
      return new Response(HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // 2. CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    // 3. 上传接口
    if (pathname === "/api/upload-public" && request.method === "POST") {
      try {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file || !(file instanceof File)) {
          return new Response(JSON.stringify({ error: "未提供有效文件" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
        return await handleFileUpload(file, env);
      } catch (e) {
        console.error("上传处理出错:", e);
        return new Response(JSON.stringify({ error: "服务器内部错误" }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // 4. 文件下载：通过 /{id} 访问（如 /abc123）
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 1 && segments[0].length >= 6) {
      const id = segments[0];
      // 防止与 API 路径冲突
      const reservedPaths = new Set(['api', 'upload', 'f', 'about', 's']);
      if (!reservedPaths.has(id)) {
        const entry = await env.TEMP_STORE.getWithMetadata(id, "arrayBuffer");
        if (entry.value) {
          return new Response(entry.value, {
            headers: {
              "Content-Type": entry.metadata?.contentType || "application/octet-stream",
              "Content-Disposition": "attachment; filename=\"" +
                encodeURIComponent(entry.metadata?.filename || 'file') + "\"",
              "Cache-Control": "no-store"
            }
          });
        }
      }
    }

    // 5. 未匹配路由 → 404
    return new Response("Not Found", { status: 404 });
  }
};
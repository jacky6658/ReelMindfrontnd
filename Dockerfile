FROM nginx:alpine

# 複製前端檔案到 nginx 的 html 目錄
COPY . /usr/share/nginx/html/

# 複製 nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 8080

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]

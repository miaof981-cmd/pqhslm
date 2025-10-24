#!/bin/bash

# 创建公告管理页
mkdir -p notice-manage
cd notice-manage
cat > index.json << 'EOF'
{
  "navigationBarTitleText": "公告管理",
  "navigationBarBackgroundColor": "#ffffff",
  "navigationBarTextStyle": "black",
  "backgroundColor": "#F5F5F5",
  "enablePullDownRefresh": true
}
EOF
echo "公告管理页JSON创建完成"
cd ..

# 创建轮播图管理页
mkdir -p banner-manage
cd banner-manage
cat > index.json << 'EOF'
{
  "navigationBarTitleText": "轮播图管理",
  "navigationBarBackgroundColor": "#ffffff",
  "navigationBarTextStyle": "black",
  "backgroundColor": "#F5F5F5",
  "enablePullDownRefresh": true
}
EOF
echo "轮播图管理页JSON创建完成"
cd ..

# 创建客服二维码管理页
mkdir -p service-qr-manage
cd service-qr-manage
cat > index.json << 'EOF'
{
  "navigationBarTitleText": "客服管理",
  "navigationBarBackgroundColor": "#ffffff",
  "navigationBarTextStyle": "black",
  "backgroundColor": "#F5F5F5",
  "enablePullDownRefresh": true
}
EOF
echo "客服管理页JSON创建完成"
cd ..

# 创建人员管理页
mkdir -p staff-manage
cd staff-manage
cat > index.json << 'EOF'
{
  "navigationBarTitleText": "人员管理",
  "navigationBarBackgroundColor": "#ffffff",
  "navigationBarTextStyle": "black",
  "backgroundColor": "#F5F5F5",
  "enablePullDownRefresh": true
}
EOF
echo "人员管理页JSON创建完成"
cd ..

# 创建业绩报表页
mkdir -p report
cd report
cat > index.json << 'EOF'
{
  "navigationBarTitleText": "业绩报表",
  "navigationBarBackgroundColor": "#ffffff",
  "navigationBarTextStyle": "black",
  "backgroundColor": "#F5F5F5",
  "enablePullDownRefresh": true
}
EOF
echo "业绩报表页JSON创建完成"
cd ..

# 创建媒体资源库页
mkdir -p media-library
cd media-library
cat > index.json << 'EOF'
{
  "navigationBarTitleText": "媒体资源库",
  "navigationBarBackgroundColor": "#ffffff",
  "navigationBarTextStyle": "black",
  "backgroundColor": "#F5F5F5",
  "enablePullDownRefresh": true
}
EOF
echo "媒体资源库页JSON创建完成"
cd ..

# 创建系统设置页
mkdir -p system-settings
cd system-settings
cat > index.json << 'EOF'
{
  "navigationBarTitleText": "系统设置",
  "navigationBarBackgroundColor": "#ffffff",
  "navigationBarTextStyle": "black",
  "backgroundColor": "#F5F5F5",
  "enablePullDownRefresh": false
}
EOF
echo "系统设置页JSON创建完成"
cd ..

echo "所有页面目录创建完成！"

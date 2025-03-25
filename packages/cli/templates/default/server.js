const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API 路由
app.get('/api/data', (req, res) => {
    res.json({
        message: 'Welcome to ACIP Development Server',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// 所有其他路由返回 index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(port, () => {
    console.log(`Development server running at http://localhost:${port}`);
}); 
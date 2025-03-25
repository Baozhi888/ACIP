async function fetchApiData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        const apiDataElement = document.getElementById('api-data');
        apiDataElement.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        console.error('Error fetching API data:', error);
        const apiDataElement = document.getElementById('api-data');
        apiDataElement.textContent = 'Error loading API data';
        apiDataElement.style.color = '#e74c3c';
    }
}

// 初始加载
fetchApiData();

// 每5秒更新一次
setInterval(fetchApiData, 5000); 
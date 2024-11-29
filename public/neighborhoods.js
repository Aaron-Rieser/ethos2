async function loadNeighborhoods() {
    try {
        console.log('Starting to fetch neighborhoods...');
        const response = await fetch('/Toronto_New_Neighbourhoods.geojson');
        console.log('GeoJSON fetch response:', response);
        
        const data = await response.json();
        console.log('GeoJSON data:', data);
        console.log('First feature properties:', data.features[0].properties);
        
        const neighborhoods = data.features.map(feature => 
            feature.properties.name
        ).sort();
        console.log('Extracted neighborhoods:', neighborhoods);

        const select = document.getElementById('neighbourhood');
        console.log('Select element found:', select);
        
        neighborhoods.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
            console.log('Added option:', name);
        });
    } catch (error) {
        console.error('Detailed error in loadNeighborhoods:', error);
        console.log('Response:', error.response);
        console.log('Data:', error.data);
    }
}

console.log('neighborhoods.js loaded');
document.addEventListener('DOMContentLoaded', loadNeighborhoods);
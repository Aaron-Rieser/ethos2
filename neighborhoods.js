async function loadNeighborhoods() {
    try {
        const response = await fetch('/Toronto_New_Neighbourhoods.geojson');
        const data = await response.json();
        
        const neighborhoods = data.features.map(feature => 
            feature.properties.name
        ).sort();

        const select = document.getElementById('neighbourhood');
        neighborhoods.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading neighborhoods:', error);
        console.log('Response:', error.response);
        console.log('Data:', error.data);
    }
}

document.addEventListener('DOMContentLoaded', loadNeighborhoods);
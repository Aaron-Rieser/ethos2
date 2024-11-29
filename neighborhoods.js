async function loadNeighborhoods() {
    try {
        const response = await fetch('/Toronto_New_Neighbourhoods.geojson');
        const data = await response.json();
        
        const neighborhoods = data.features.map(feature => 
            feature.properties.AREA_NAME
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
    }
}

document.addEventListener('DOMContentLoaded', loadNeighborhoods);
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

        // Get both select elements
        const selects = document.querySelectorAll('select[name="neighbourhood"]');
        console.log('Found select elements:', selects.length);
        
        // Populate each select element with neighborhoods
        selects.forEach(select => {
            neighborhoods.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                select.appendChild(option);
                console.log('Added option:', name, 'to select:', select.id);
            });
        });
    } catch (error) {
        console.error('Detailed error in loadNeighborhoods:', error);
        console.log('Response:', error.response);
        console.log('Data:', error.data);
    }
}

console.log('neighborhoods.js loaded');
document.addEventListener('DOMContentLoaded', loadNeighborhoods);
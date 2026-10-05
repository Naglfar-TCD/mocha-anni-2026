function initializeMap() {
    var map = L.map('map', {
        center: [40, 0],
        maxBounds: [[-90, 240], [90, -180]],
        maxBoundsViscosity: 0.6,
        zoom: 2,
        minZoom: 2,
        maxZoom: 15,
        zoomControl: false,
        zoomAnimationThreshold: 3,
    });

    // Map formatting
    fetch('https://tiles.openfreemap.org/styles/liberty')
        .then(response => response.json())
        .then(style => {

            // Remove shield markers
            style.layers = style.layers.filter(layer =>
                !layer.id.includes('shield')
            );

            // Remove road labels
            style.layers = style.layers.filter(layer =>
                layer.id !== 'road_label'
            );

            // Change water color
            const waterLayer = style.layers.find(
                layer => layer.id === 'water'
            );

            if (waterLayer) {
                waterLayer.paint['fill-color'] = '#87c1ff';
            }

            // Change road color
            const roadColors = {
                'road_minor': '#d8d8d8',
                'road_secondary_tertiary': '#d0d0d0',
                'road_secondary_tertiary_casing': '#999999',
                'road_trunk_primary': '#c8c8c8',
                'road_trunk_primary_casing': '#999999',
                'road_motorway': '#c0c0c0',
                'road_motorway_casing': '#999999'
            };

            style.layers.forEach(layer => {

                if (roadColors[layer.id]) {

                    if (!layer.paint) {
                        layer.paint = {};
                    }

                    layer.paint['line-color'] =
                        roadColors[layer.id];

                    layer.paint['line-opacity'] = 0.3;
                }

            });

            L.maplibreGL({
                style: style
            }).addTo(map);

        });

    return map;
}

const map = initializeMap();
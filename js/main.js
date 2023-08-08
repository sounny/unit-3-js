(function(){

    // pseudo-global variables
    var attrArray = ["2013 Population", "2015 Population", "2017 Population", "2019 Population", "2021 Population", "2013 Median Rent", "2015 Median Rent", "2017 Median Rent", "2019 Median Rent", "2021 Median Rent"]; // list of attributes
    var expressed = attrArray[2]; // initial attribute

    // begin script when window loads
    window.onload = setMap();

    // set up choropleth map
    function setMap() {
        // map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 460;

        // create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        // create Albers equal area conic projection centered on USA
        var projection = d3.geoAzimuthalEqualArea()
            .center([-5.42, 41.01])
            .rotate([104.59, -9.98, 0])
            .scale(452.01)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath()
            .projection(projection);

        // use Promise.all to parallelize asynchronous data loading
        var promises = [];
        promises.push(d3.csv("data/pop_impact_on_rent.csv")); // load attributes from csv
        promises.push(d3.json("data/USStates.topojson")); // load choropleth spatial data
        Promise.all(promises).then(callback);

        function callback(data) {
            var csvData = data[0],
                states = data[1];

            // place graticule on the map
            setGraticule(map, path);

            // translate USStates TopoJSON
            var USStates = topojson.feature(states, states.objects.USStates).features;

            // add USStates to map
            var states = map.append("path")
                .datum(USStates)
                .attr("class", "state")
                .attr("d", path);

            // join csv data to GeoJSON enumeration units
            USStates = joinData(USStates, csvData);

            // create the color scale
            var colorScale = makeColorScale(csvData);

            // add enumeration units to the map
            setEnumerationUnits(USStates, map, path, colorScale);

            // add coordinated visualization to the map
            setChart(csvData, colorScale);
        }
    }

    // function to create color scale generator
    function makeColorScale(data) {
        var colorClasses = [
            "#d7191c",
            "#fdae61",
            "#ffffbf",
            "#abd9e9",
            "#2c7bb6"
        ];

        // create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        }

        // assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    }

    function joinData(USStates, csvData) {
        // loop through csv to assign each set of csv attribute values to geojson region
        for (var i = 0; i < csvData.length; i++) {
            var csvState = csvData[i]; // the current region
            var csvKey = csvState.AFFGEOID; // the CSV primary key

            // loop through geojson regions to find correct region
            for (var a = 0; a < USStates.length; a++) {

                var geojsonProps = USStates[a].properties; // the current region geojson properties
                var geojsonKey = geojsonProps.AFFGEOID; // the geojson primary key

                // where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {

                    // assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvState[attr]); // get csv attribute value
                        geojsonProps[attr] = val; // assign attribute and value to geojson properties
                    });
                }
            }
        }
        return USStates;
    }

    function setGraticule(map, path) {
        // create graticule generator
        var graticule = d3.geoGraticule()
            .step([2, 2]); // place graticule lines every 2 degrees of longitude and latitude

        // create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) // bind graticule background
            .attr("class", "gratBackground") // assign class for styling
            .attr("d", path); // project graticule

        // create graticule lines
        var gratLines = map.selectAll(".gratLines") // select graticule elements that will be created
            .data(graticule.lines()) // bind graticule lines to each element to be created
            .enter() // create an element for each datum
            .append("path") // append each element to the svg as a path element
            .attr("class", "gratLines") // assign class for styling
            .attr("d", path); // project graticule lines
    }

    function setEnumerationUnits(USStates, map, path, colorScale) {
        // add states to map
        var states = map.selectAll(".states")
            .data(USStates)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "state " + d.properties.name;
            })
            .attr("d", path)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
            });
    }

    // function to create coordinated bar chart
    function setChart(csvData, colorScale) {
        // chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
            chartHeight = 473,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        // create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        // create a scale to size bars proportionally to frame
        var yScale = d3.scaleLinear()
            .range([0, chartInnerHeight]) // Adjusted range
            .domain([0, d3.max(csvData, function (d) {
                return parseFloat(d[expressed]);
            })]);

        // set bars for each state
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .attr("class", function (d) {
                return "bar " + d.adm1_code;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function (d, i) {
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function (d, i) {
                return chartInnerHeight - yScale(parseFloat(d[expressed])); // Adjusted height calculation
            })
            .attr("y", function (d, i) {
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .style("fill", function (d) {
                return colorScale(d[expressed]);
            });

        // create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        // place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

       // create frame for chart border
var chartFrame = chart.append("rect")
.attr("class", "chartFrame")
.attr("width", chartWidth) 
.attr("height", chartHeight) 
.attr("transform", translate);

// create a text element for the chart title
var chartTitle = chart.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", 30) // Adjust the y-coordinate for vertical positioning
    .attr("class", "chartTitle")
    .attr("text-anchor", "middle")
    .text("Impact of Population on Rent by State");



    }
})();


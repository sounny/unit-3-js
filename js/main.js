(function() {
    // Array containing the attributes for which data will be displayed
    var attrArray = ["Total Population", "Total Owner-Occupied Units", "Total Renter-Occupied Units", "Monthly Median Mortgage", "Monthly Median Rent"];
    // Initial attribute to be displayed
    var expressed = attrArray[0];

    // Dimensions and paddings for the chart
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    // Scale for the y-axis of the chart
    var yScale = d3.scaleLinear()
        .range([463, 0]) // Mapping data values to pixel values within the chart height
        .domain([0, 100000]); // Data range for the y-axis

    // Function to be called when the window loads
    window.onload = setMap;

    // Function to set up the initial map
    function setMap() {
        // Dimensions for the map container
        var width = window.innerWidth * 0.5,
            height = 460;

        // Creating an SVG element to hold the map
        var map = d3.select(".map-container")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

// Creating a projection for the map using Albers USA projection
        var projection = d3.geoAlbersUsa()
            .scale(900)
            .translate([width / 2, height / 2]);

// Creating a path generator based on the projection
        var path = d3.geoPath()
            .projection(projection);

        // Loading CSV and TopoJSON data using promises
var promises = [
    d3.csv("data/pop_impact_on_rent.csv"), // Loading CSV data for attribute values
    d3.json("data/USStates.topojson") // Loading TopoJSON data for state boundaries
        ];
        Promise.all(promises).then(callback);

        // Callback function to handle data once it's loaded
function callback(data) {
    var csvData = data[0], // CSV data with attribute values
        stateData = data[1]; // TopoJSON data for state boundaries

           // Converting TopoJSON data to GeoJSON format
    var USStates = topojson.feature(stateData, stateData.objects.USStates).features;

    // Joining CSV data with GeoJSON data
    USStates = joinData(USStates, csvData);

    // Creating a color scale for mapping attribute values to colors
    var colorScale = makeColorScale(csvData);

    // Setting up the map with colored enumeration units
    setEnumerationUnits(USStates, map, path, colorScale);
    
     // Creating and setting up the chart based on CSV data and color scale
            setChart(csvData, colorScale);
     // Creating a dropdown menu for attribute selection
            createDropdown(csvData);
        }
    }

    // Function to create a color scale based on attribute values
    function makeColorScale(data) {
        // Array of color classes for the map legend
        var colorClasses = [
            "#d7191c",
            "#fdae61",
            "#ffffbf",
            "#abd9e9",
            "#2c7bb6"
        ];

         // Creating a quantile scale to map attribute values to colors
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

         // Creating an array of attribute values from the data
    var domainArray = data.map(item => parseFloat(item[expressed]));

        // Setting the domain of the color scale based on attribute values
    colorScale.domain(domainArray);

    // Returning the color scale
    return colorScale;
    }

    // Function to join CSV data with GeoJSON data based on a common key
    function joinData(USStates, csvData) {
        for (var i = 0; i < csvData.length; i++) {
            var csvState = csvData[i];
            var csvKey = csvState.AFFGEOID;

            for (var a = 0; a < USStates.length; a++) {
                var geojsonProps = USStates[a].properties;
                var geojsonKey = geojsonProps.AFFGEOID;

                 // Matching the common key between CSV and GeoJSON data
                if (geojsonKey == csvKey) {
                    // Loop through each attribute in the attribute array
                    attrArray.forEach(function(attr) {
                        var val = parseFloat(csvState[attr]);
                        geojsonProps[attr] = val;
                    });
                    geojsonProps.NAME = csvState["NAME"];
                }
            }
        }
        return USStates; // Returning the joined data
    }

    // Function to set up the map's enumeration units (states)
    function setEnumerationUnits(USStates, map, path, colorScale) {
         // Selecting all paths representing states and binding GeoJSON data
        var states = map.selectAll(".states")
            .data(USStates)
            .enter()
            .append("path") // Setting the path using the projection
            .attr("class", d => "state " + d.properties.NAME) // Assigning class and state name
            .attr("d", path)
            .style("fill", d => {
                var value = d.properties[expressed];
                return value ? colorScale(value) : "#ccc"; // Filling with color based on attribute value
            })
            .on("mouseover", function(event, d) {
                highlight(d.properties); // Highlight state on mouseover
            })
            .on("mouseout", function(event, d){
                console.log("Mouseout state:", d);
                dehighlight(d); // Remove highlight on mouseout
             })
        .on("mousemove", moveLabel); // Move data label on mousemove
}          
    
// Function to set up the chart based on CSV data and color scale
    function setChart(csvData, colorScale) {
        // Creating an SVG element to hold the chart
        var chart = d3.select(".chart-container")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

    // Creating and styling bars for the chart
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort((a, b) => b[expressed] - a[expressed]) // Sorting bars in descending order
            .attr("class", d => "bar id-" + d.AFFGEOID) // Assigning classes for styling and identification
            .attr("width", chartInnerWidth / csvData.length - 5)
            .attr("x", (d, i) => i * (chartInnerWidth / csvData.length) + leftPadding) // Positioning bars horizontally
            .attr("height", d => chartInnerHeight - yScale(parseFloat(d[expressed]))) // Setting bar heights
            .attr("y", d => yScale(parseFloat(d[expressed])) + topBottomPadding) // Positioning bars vertically
            .style("fill", d => colorScale(d[expressed])) // Filling bars with color based on attribute value
            .on("mouseover", function(event, d){
                console.log("Hovered over a bar with data:", d);
                highlight(d); // Highlight associated map feature on mouseover
            })
            .on("mouseout", function(event, d){
                dehighlight(d); // Remove highlight on mouseout
            })
            .on("mousemove", moveLabel); // Move data label on mousemove
        
        // Creating and adding the y-axis to the chart
        var yAxis = d3.axisLeft()
            .scale(yScale);

        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        // Adding a frame around the chart
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("transform", translate);

// Adding a title to the chart
        var chartTitle = chart.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", 30)
            .attr("class", "chartTitle")
            .attr("text-anchor", "middle")
            .text("Select Attribute");
    }

    // Function to create a dropdown menu for attribute selection
    function createDropdown(csvData) {
        var dropdown = d3.select(".dropdown-container")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function() {
                changeAttribute(this.value, csvData); // Call function on attribute change
            });

        // Adding an option for selecting attributes
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        // Adding options for each attribute in the attribute array
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);
    }

    // Function to change the displayed attribute and update the chart
    function changeAttribute(attribute, csvData) {
        expressed = attribute; // Update the currently displayed attribute
        var colorScale = makeColorScale(csvData); // Recreate the color scale based on new attribute
        
         // Calculate new y-axis domain based on data range
        var max = d3.max(csvData, d => parseFloat(d[expressed]));
        var min = d3.min(csvData, d => parseFloat(d[expressed]));
    
        yScale.domain([min, max]); // Update the y-scale domain

        // Transition to update map state colors based on the current attribute
        d3.selectAll(".states")
            .transition()
            .duration(1000)
            .style("fill", d => {
                var value = d.properties[expressed];
                return value ? colorScale(value) : "#ccc";
            });

        // Transition to update and sort bars in the chart
        d3.selectAll(".bar")
            .sort((a, b) => b[expressed] - a[expressed])
            .transition()
            .delay((d, i) => i * 20)
            .duration(500)
            .attr("x", (d, i) => i * (chartInnerWidth / csvData.length) + leftPadding)
            .attr("height", d => chartInnerHeight - yScale(parseFloat(d[expressed])))
            .attr("y", d => yScale(parseFloat(d[expressed])) + topBottomPadding)
            .style("fill", d => colorScale(d[expressed]));

        // Updating the y-axis with transitions
        var yAxis = d3.axisLeft()
            .scale(yScale);

        d3.selectAll(".axis")
            .call(yAxis);

            // Updating the chart title with the current displayed attribute
            var chartTitle = d3.select(".chartTitle")
            .text(expressed + " Per State"); // Update the chart title text
    }

    // Function to highlight a map feature and its corresponding bar
    function highlight(d) {
        // Get the right properties object based on the data structure
        var props = d.properties ? d.properties : d;
        var name = props.NAME;
        var affgeoid = props.AFFGEOID;

     // Highlight the state on the map using class selection
    d3.selectAll(".state." + name)
        .style("stroke", "blue")
        .style("stroke-width", "2");
    setLabel(props);

    // Highlight the corresponding bar using class selection
    d3.selectAll(".bar.id-" + affgeoid)
        .style("stroke", "blue")
        .style("stroke-width", "2");
        
    console.log("Trying to highlight state:", name, "and bar with AFFGEOID:", affgeoid);
}

// Function to remove the highlight from a map feature and its corresponding bar
function dehighlight(d) {
    // Get the right properties object based on the data structure
    var props = d.properties ? d.properties : d;
    var name = props.NAME;
    var affgeoid = props.AFFGEOID;
    
    // Function to dehighlight state and bar when mouse moves out
    console.log("Dehighlighting state:", name, "and bar:", affgeoid);
    
    if (name) {
        // Reset the state outlines to default
        d3.selectAll(".state." + name)
            .style("stroke", null) 
            .style("stroke-width", null);
    }
    
    if (affgeoid) {
        // Reset the bar outlines to default
        d3.selectAll(".bar.id-" + affgeoid)
            .style("stroke", null) 
            .style("stroke-width", null);
    }
    
    // Remove the info label
    d3.select(".infolabel").remove();
}

//function to create dynamic label
function setLabel(props){
     // Label content based on the selected attribute
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.NAME + "_label")
        .html(labelAttribute);

     // Adding the state name to the label
    var stateName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.NAME);
};

//Example 2.8 line 1...function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = event.clientX + 10,
        y1 = event.clientY - 75,
        x2 = event.clientX - labelWidth - 10,
        y2 = event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = event.clientY < 75 ? y2 : y1; 

     // Move the info label to the calculated coordinates
    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};  
})();

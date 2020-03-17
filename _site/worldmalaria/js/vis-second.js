// AREA CHART: stacked area chart depicting funding from different sources 

// margin
var margin = { top: 30, right: 200, bottom: 30, left: 200 };
var width = $("#" + "fundingvis").width() - margin.left - margin.right,
height = 400 - margin.top - margin.bottom;

// SVG drawing area
var fundingsvg = d3.select("#" + "fundingvis").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Initialize data
loadData();

// funding data
var datafunding; 

// Load CSV file
function loadData() {
	d3.csv("data/global-funding.csv", function(error, csv) {

        // remove all instances of "Total" property from data
        csv.forEach(function(d) {
            delete d["Total"];
        });
        
        // convert numeric values
        csv.forEach(function(d){
			// Convert numeric values to 'numbers'
			d["Global Fund"] = +d["Global Fund"];
			d["United States"] = +d["United States"];
			d["Domestic Resources"] = +d["Domestic Resources"];
			d["United Kingdom"] = +d["United Kingdom"];
            d["World Bank"] = +d["World Bank"];
			d["All Other Sources"] = +d["All Other Sources"];
		});
        
		// store csv data as data funding
		datafunding = csv;
        
        console.log(datafunding);
        
		// Draw the visualization for the first time
		updateVisualization();
    
    });
};

var parseDate = d3.timeParse("%Y");

// initalize scales
var x = d3.scaleTime()
    .range([0, width])

var y = d3.scaleLinear()
    .range([height, 0]);

// create axes
var xaxis = d3.axisBottom()
    .tickFormat(d3.timeFormat("%Y"))
    .scale(x);

var yaxis = d3.axisLeft()
    .scale(y);

// color scale
var colorscale = d3.scaleOrdinal()
    .range(["#e0ecf4", "#bfd3e6", "#9ebcda", "#8c96c6", "#8c6bb1", "#88419d", "#810f7c", "#4d004b"].reverse())

// hover label
fundingsvg.append("text")
    .attr("class", "ylabel")
    .attr("transform", "translate(10, 20)")
    .text("in millions USD")


// axes
var xAxis = d3.axisBottom()
    .scale(x);

var yAxis = d3.axisLeft()
    .scale(y);

fundingsvg.append("g")
    .attr("class", "x-axis axis")
    .attr("transform", "translate(0," + height + ")");


fundingsvg.append("g")
    .attr("class", "y-axis axis")
function updateVisualization() {
    
    // update x domain
    x.domain([parseDate(d3.min(datafunding, function(d) { return d.Year; })), parseDate(d3.max(datafunding, function(d) { return d.Year; }))]);

    // array of years
    var years = datafunding.map(function(d){ return d["Year"]; });

    // array of funding sources
    var sources = datafunding["columns"].filter(function(d){ return d != "Year"; });
    sources.pop("Total");
    sources.reverse();
    
    // update color scale
    colorscale.domain(sources);
 
    var stack = d3.stack()
        .keys(sources);

    var fundingstack = stack(datafunding).reverse();
    
    console.log(fundingstack);
    
    // update y domain
    y.domain([0, d3.max(fundingstack, function(d) {
			return d3.max(d, function(e) {
				return e[1];
			});
		})
	]);
    
    // stacked-area 
	var area = d3.area()
    .curve(d3.curveCardinal)
    .x(function(d, i) { return x(parseDate(years[i])) })
    .y0(function(d) { return y(d[0]); })
    .y1(function(d) { return y(d[1]); });
    
    // draw stacked area chart
    var fundingsources = fundingsvg.selectAll(".area")
        .data(fundingstack);

    fundingsources.enter().append("path")
        .attr("class", "area")
        .merge(fundingsources)
        .style("fill", function(d,i) {
            return colorscale(sources[i]);
        })
        .attr("d", function(d) {
            return area(d);
        });
    
    // area hover label behavior
    var labels = sources.reverse()
    d3.selectAll(".area").on("mouseover", function (d,i) {
        $(".fundinginfo .vislabel").html(labels[i]);
    })
    d3.selectAll(".area").on("mouseout", function (d,i) {
        $(".fundinginfo .vislabel").html("All");
    })
    
    // call axis functions
	fundingsvg.select(".x-axis").call(xAxis);
    fundingsvg.select(".y-axis").call(yAxis);
};


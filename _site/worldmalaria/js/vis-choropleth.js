

// --> CREATE SVG DRAWING AREA
var margin = { top: 30, right: 30, bottom: 30, left: 100 };
var width = $("#" + "mapvis").width() - margin.left - margin.right,
height = 575 - margin.top - margin.bottom;

// SVG drawing area
var mapsvg = d3.select("#" + "mapvis").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// initialize selected filter value
var selected = d3.select("#select-malaria").property("value");

// titles corresponding to select box filter values
var titles = {
    "UN_population" : "UN Population",
    "At_risk" : "% At Risk", 
    "At_high_risk": "% At High Risk",
    "Suspected_malaria_cases": "Suspected Malaria Cases",
    "Malaria_cases": "Diagnosed Malaria Cases"
};

// update map title
$(".maptitle .vislabel").html(titles[selected]);

// Malaria Data for Africa
var dataAfrica = {};

// TopoJson Data for Africa
var africa_map = [];

// queue.js to read two files
queue()
  .defer(d3.json, "data/africa.topo.json")
  .defer(d3.csv, "data/global-malaria-2015.csv")
  .await(function(error, mapTopJson, malariaDataCsv){
    
    // --> PROCESS DATA
    console.log(malariaDataCsv);
    console.log(mapTopJson);
    
    // map data to dataAfrica
    malariaDataCsv.forEach(function(d){
        if (d.WHO_region == "African") {
            // convert data
            d.UN_population = +d.UN_population
            d.At_risk = +d.At_risk
            d.At_high_risk = +d.At_high_risk
            d.Suspected_malaria_cases = +d.Suspected_malaria_cases
            d.Malaria_cases = + d.Malaria_cases
            dataAfrica[d.Code] = d;
        }
    });
    
    console.log(dataAfrica);
    
    // create projection 
    var projection = d3.geoMercator()
      .center([0,0])
      .scale(width * .4)
      .translate([width / 6, height * .78]);

    var path = d3.geoPath()
    .projection(projection);
    
    // convert TopoJSON to GeoJSON 
    var africa_map = topojson.feature(mapTopJson, mapTopJson.objects.collection).features
    
    // render map via path generator
    mapsvg.selectAll("path")
        .data(africa_map)
        .enter().append("path")
        .attr("class", "africa-map")
        .attr("stroke", "#ffffff")
        .attr("d", path)
    
    console.log(africa_map);
    
    // Update choropleth
    updateChoropleth();
  });

// array containing values from selected property
selectedvalues = [];

function updateChoropleth() {

    // --> Choropleth implementation
    
    // update selectedvalues with corresponding values
    for (var key in dataAfrica) {
            selectedvalues.push(dataAfrica[key][selected]);
        };
    
    // colorscale
    // color range from colorbrewer: http://colorbrewer2.org/#type=sequential&scheme=BuGn&n=5

    // quantile color scale is best suited for discrete data whereas the threshold color scale is better suited for continuous data along a percentage spectrum
    
    // use quantile color scale for UN population and suspected/diagosed malaria cases
    if (selected == "UN_population" || selected == "Suspected_malaria_cases" || selected == "Malaria_cases" ) {
        var colorscale = d3.scaleQuantile()
        .domain(selectedvalues)
        .range(["#e8e8e8", "#bfd3e6", "#9ebcda", "#8c96c6", "#8856a7", "#810f7c"]);
        var colordomain = colorscale.quantiles();
    }
    // use threshold color scale for at risk and at high risk 
    else if (selected == "At_risk" || selected == "At_high_risk") {
        var colordomain = [d3.min(selectedvalues), d3.min(selectedvalues) + (d3.max(selectedvalues) - d3.min(selectedvalues)) / 4, d3.min(selectedvalues) + 2 * (d3.max(selectedvalues) - d3.min(selectedvalues)) / 4, d3.min(selectedvalues) + 3 * (d3.max(selectedvalues) - d3.min(selectedvalues)) / 4, d3.max(selectedvalues)];
        var colorscale = d3.scaleThreshold()
            .domain(colordomain)
            .range(["#e8e8e8", "#bfd3e6", "#9ebcda", "#8c96c6", "#8856a7", "#810f7c"]);
    }
    
    // chloropleth based on color scale
    mapsvg.selectAll(".africa-map").attr("fill", function(d) {
        if (Object.keys(dataAfrica).includes(d.properties.adm0_a3_is)) {
            // NaN values: fill with grey
            if (isNaN(dataAfrica[d.properties.adm0_a3_is][selected])) {
		      return "#e8e8e8";
            } else {
                // use colorscale to produce chloropleth map
                return colorscale(dataAfrica[d.properties.adm0_a3_is][selected]);   
            }
            // countries with information not given in data set: fill with grey
        } else {
                 return "#e8e8e8";
            }
    }).transition().duration(600); 
    
    // initialize legend
    var legend = mapsvg.selectAll("rect")
        .data(colordomain)
    
    // enter
    legend.enter().append("rect")
    // update
    .merge(legend)
    .attr("x", 0)
    .attr("y", function(d, i){ return height + 150 - (i*20)})
    .attr("width", 20)
    .attr("height", 20)
    .style("fill", function(d) { return colorscale(d); });
    
    // exit
    legend.exit().remove();
    
    // legend labels
    var legendlabel = mapsvg.selectAll(".legendlabel")
        .data(colordomain)
    
    // enter
    legendlabel.enter()
    .append("text")
    .attr("class", "legendlabel")
    // update
    .merge(legendlabel)
    .attr("x", 30)
    .attr("y", function(d, i){ return height + 163 - (i*20); })
    .text(function(d){ return Math.round(d) + "+"; });
    
    // exit
    legendlabel.exit().remove()
    
    // tooltip implementation from d3-tip library (as used in homework 5)
    // initialize tooltip 
    var tip = d3.tip().attr('class', 'd3-tip tooltip-title').html(function(d) {
         if (Object.keys(dataAfrica).includes(d.properties.adm0_a3_is)) {
            // NaN values: information not available
            if (isNaN(dataAfrica[d.properties.adm0_a3_is][selected])) {
		      return d.properties.name.toUpperCase() + "<br /> <hr />" + "<i>" + titles[selected] + " information is not available</i>";
            } else {
                // update tooltip with information
                return d.properties.name.toUpperCase() + "<br /> <hr />" + titles[selected] + ": <i>" + dataAfrica[d.properties.adm0_a3_is][selected] + "</i>";
            }
        // WHO data not available
        } else {
                return d.properties.name.toUpperCase() + "<br /> <hr />" + "<i>" + titles[selected] + " information is not available</i>";
            }
    });
    
    tip.offset([-15, 0]);
    
    // invoke tooltip 
    mapsvg.call(tip);
    
    mapsvg.selectAll("path")
    .on('mouseover', tip.show)
    .on('mouseout', tip.hide);
    
};

// update visualization if new dropdown filter is selected
d3.select("#select-malaria").on("change", function() { 
    // update selection value
    selected = d3.select("#select-malaria").property("value");
    selectedvalues = [];
    colordomain = [];
    // update map title
    $(".maptitle .vislabel").html(titles[selected]);
    // update chloropleth map
    updateChoropleth();
});

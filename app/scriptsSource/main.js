var d3 = require('d3');
var async = require('async');
var _ = require('lodash')

var margin = {top: 20, right: 10, bottom: 20, left: 10};
var width = 1100 - margin.left - margin.right,
    height = 900 - margin.top - margin.bottom;

var stringsStart = 100;
var stringsEnd = 500;

var svg = d3.select('.svg-container').append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
.append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var bottomLayer = svg.append('g');
var strings = svg.append('g');
var topLayer = svg.append('g');

addDefs(svg);

var startDate = new Date();
startDate = startDate.setFullYear(1800);
var endDate = new Date();
console.log(startDate);
var dateFormat = d3.time.format("%Y");

var reduceAmount = 5;

var yearScale = d3.time.scale()
  .domain([startDate, endDate])
  .range([margin.left, width + margin.left]);

var volumeScale = d3.scale.linear()
  .domain([1, 20000])
  .range([2, 15]);

var opacityScale = d3.scale.linear()
  .domain([0, 30000])
  .range([.1, 1]);

var lineScale = d3.scale.linear()
  .domain([0,500000])
  .range([75,10])

var lineScaleDeath = d3.scale.linear()
    .domain([0,500000])
    .range([10,75])

var color = d3.scale.category20();

var yearAxisLabel = d3.svg.axis()
    .orient('top')
    .scale(yearScale)
    .ticks(d3.time.years, 5)
    .tickFormat(function(d,i) {
      if(i%4 === 1) {
        var commasFormatter = d3.time.format("%Y");
        return commasFormatter(d);
      } else {
        return "";
      }
    })
    .tickSize(6, 2, 1);

var bottomYearAxis = d3.svg.axis()
    .orient('bottom')
    .scale(yearScale)
    .ticks(d3.time.years, 5)
    .tickFormat(function(d,i) {
        return "";

    })
    .tickSize(6, 2, 1);

var yearAxis = topLayer.append('g')
  .attr('transform', 'translate(0,'+stringsStart+')')
  .attr('class', 'axis-year')
  .call(yearAxisLabel);

var bottomyYearAxis = topLayer.append('g')
  .attr('transform', 'translate(0,'+stringsEnd+')')
  .attr('class', 'axis-year')
  .call(bottomYearAxis);

async.series({
  burials : function(cb) {
    d3.tsv("./scripts/processed-tenyears.tsv", function(err,data) {
      cb(err,data);
    });
  },
  wars : function(cb) {
    d3.tsv("./scripts/us-wars.txt", function(err,data) {
      cb(err,data);
    });
  }
}, loaded);

function loaded(err, data) {
  var colorified = false;
  d3.select('#colorify')
    .on('click', function() {
      if(!colorified) {

        labelString.style('fill', function(d,i) { return color(i) });

        bgLines
          .style('stroke-opacity', .2)
          .style('stroke', function(d) {
            var topWar = {"name" : "", "count" : 0, "index" : -1};
            wars.map(function(war, i) {
              if(parseInt(d[war.war]) > topWar.count) {
                topWar.name = war.war;
                topWar.index = i;
                topWar.count = d[war.war];
              }

            });
            return color(topWar.index);
          })
          colorified = true;

      } else {
        labelString.style('fill', function(d,i) { return "#fff" });

        bgLines
          .style('stroke-opacity', .2)
          .style('stroke', function(d) {
            return "#aaa";
          })
        colorified = false;
      }

    })

  addWarStats(data);

  var burials = data.burials;
  var wars = data.wars;

  var brush = d3.svg.brush()
      .x(yearScale)
      .on("brush", brushed);

  var gBrush = topLayer.append('g')
    .attr('transform', "translate(0,"+stringsEnd+")")
    .attr("class", "brush")

  gBrush.append('rect')
    .attr('width', yearScale.range()[1] - yearScale.range()[0])
    .attr('x', 10)
    .style('fill', 'rgba(0,0,0,.1)')

  gBrush
    .call(brush);



  gBrush.selectAll("rect")
      .attr("height", 20);

  var lineGraphData = generateLineGraphData(burials);
  lineGraphData = lineGraphData.sort(function(a,b) {
    return a.year - b.year;
  })
  console.log(lineGraphData)

  var linePathGen = d3.svg.line()
    .x(function(d) { return yearScale(dateFormat.parse(d.year)); })
    .y(function(d) { return lineScale(d.birth); })
    .interpolate("basis");

  var linePathGenDeath = d3.svg.line()
    .x(function(d) { return yearScale(dateFormat.parse(d.year)); })
    .y(function(d) { return lineScaleDeath(d.death); })
    .interpolate("basis");

  var lineGraphG = topLayer.append('g').attr('class', 'line-graph')
  var lineGraphDeathG = topLayer.append('g').attr('class', 'line-graph').attr('transform', 'translate(0 '+parseInt(stringsEnd+20)+')')

  lineGraphG.datum(lineGraphData).append('path').attr('d', linePathGen)
  lineGraphDeathG.datum(lineGraphData).append('path').attr('d', linePathGenDeath)

  wars = wars.sort(function(a,b) { if(a.total && b.total) { return b.total - a.total } else { return 0 };})
  var warsContainers = bottomLayer.selectAll('.wars')
    .data(wars)
    .enter()
    .append('g')
    .attr('transform', function(d) {
      var offset = yearScale(dateFormat.parse(d.start)) + 0.5*(yearScale(dateFormat.parse(d.end))-yearScale(dateFormat.parse(d.start)));
      return "translate("+offset+","+stringsStart+")"
    })

    warsContainers.append('rect')
    .attr('x', function(d) { return -0.5*(yearScale(dateFormat.parse(d.end))-yearScale(dateFormat.parse(d.start)))})
    .attr('width', function(d) { return yearScale(dateFormat.parse(d.end))-yearScale(dateFormat.parse(d.start))})
    .attr('y', 0)
    .style('stroke', '#eee')
    .style('stroke-width', 3)
    .attr('height', stringsEnd - stringsStart)
    .style('fill', "#eee");


  var lines = strings.append('g');
  var bgLines = lines.selectAll('.line')
    .data(burials)
    .enter()
    .append('path')
    .attr('d', pathGen)
    .attr('data-years', function(d) {
      return d.birth + "-" + d.death;
    })
    .style('stroke', '#aaa')
    .style('stroke-width', function(d) {
      if(d["total"]-reduceAmount > 0) {
        return volumeScale(d["total"]);
      } else {
        return 0;
      }
    })
    .style('fill', 'none')
    .style('stroke-opacity', function(d) {
      return 0.08
    });


    var warToHighlight = "WORLD WAR ";



    var highlight = lines.selectAll('.highlight')
      .data(burials, function(d) { return d.birth + "-" + d.death; })
      .enter()
      .append('path')
      .attr('d', pathGen)
      .attr('data-years', function(d) {
        return d.birth + "-" + d.death;
      })
      .style('stroke', '#97390a')
      .style('stroke-width', function(d) {
          return volumeScale(d[warToHighlight]);
      })
      .style('fill', 'none')
      .style('stroke-opacity', function(d) {
          return 0;
      });

  var textLabelsContainer = topLayer.append('g').attr('class', 'labels')
    .attr('transform', 'translate(0, '+parseInt(stringsStart + 10)+')');

  console.log(wars);
  var labelContainer = textLabelsContainer.selectAll('.war-labels')
    .data(wars)
    .enter()
    .append('g')
    .attr('class', 'war-labels')
    .attr('transform', function(d,i) {
      var size = 0;
      for(var j = 0; j < i; j++) {
        size += 35 - j *2;
      }
      return "translate(0,"+size+")";
    })


  labelContainer
    .append('text')
    .attr('class', 'text-shadow')
    .style('filter', 'url(#shadow)')
    .style('fill', "#000")
    .style('font-size', function(d,i) {
      return 35 - i *1.5;
    })
    .text(function(d) { return d.war})
    .attr('transform', 'translate(0,30)')
    .attr('text-anchor', 'middle')
    .attr('x', function(d,i) {
      return yearScale(dateFormat.parse(d.start)) + .5*(yearScale(dateFormat.parse(d.end))-yearScale(dateFormat.parse(d.start)));
    })

    .on('mouseover', function(d) {
      warToHighlight = d.war;
      updateWar();
    });

    var labelString = labelContainer
      .append('text')
      .attr('class', 'text-string')
      .style('fill', "#fff")
      .text(function(d) { return d.war})
      .style('font-size', function(d,i) {
        return 35 - i*1.5;
      })
      .attr('transform', 'translate(0,30)')
      .attr('text-anchor', 'middle')
      .attr('x', function(d,i) {
        return yearScale(dateFormat.parse(d.start)) + .5*(yearScale(dateFormat.parse(d.end))-yearScale(dateFormat.parse(d.start)));
      })
      .attr('data-color', function(d,i) {
        return color(i);
      })
      .on('mouseover', function(d) {
        warToHighlight = d.war;
        var dthis = d3.select(this);
        updateWar(dthis);
      });


  function updateWar(dthis) {
    d3.selectAll('.text-string').style('fill', 'white');
    d3.selectAll('.text-shadow').style('fill', 'black');

    d3.select(this.parentNode).select('.text-string').style('fill', 'black');
    d3.select(this.parentNode).select('.text-shadow').style('fill', 'white');

    // var c = d3.select(this).attr('data-color');
    c = dthis.attr('data-color');

    highlight.transition().duration(500).style('stroke-opacity', 0).style('stroke-width', 0);
    d3.selectAll('.text')
    highlight.filter(filterBasedOnWar).transition().duration(1000).delay(500)
      .style('stroke', c)
      .style('stroke-width', function(d) {
          return volumeScale(d[warToHighlight]);
      })
      .style('stroke-opacity', .8);
  }

  function updateBrush(spanArray) {

    highlight.transition().duration(1000).style('stroke-opacity', 0).style('stroke-width', 0).style('stroke', '#97390a' );
    highlight.filter(filterBasedOnTime(spanArray)).transition().duration(1000).delay(1000)
      .style('stroke-width', function(d) {
          return volumeScale(d.total);
      })
      .style('stroke-opacity', .4);
  }

  function filterBasedOnWar(d) {
    if (d[warToHighlight]-reduceAmount > 0) {
      return true
    } else {
      return false;
    }
  }

  function filterBasedOnTime(spanArr) {
    return function(d) {
      var dates = spanArr;
      var deathTime = dateFormat.parse(d.death).getTime();
      if(dates[0].getTime() < deathTime && dates[1].getTime() > deathTime) {
        return true;
      } else {
        return false;
      }
    }
  }

  function pathGen(d) {

    var startY = stringsStart;
    var endY = stringsEnd;

    var startX =  yearScale( dateFormat.parse(d.birth)) + Math.random();
    var endX =  yearScale( dateFormat.parse(d.death)) + Math.random();

    var offset = (endX - startX)/4;

    var val = "M"+startX+","+startY+"C"+startX+","+parseInt(startY+offset)+","+endX+","+parseInt(endY-offset)+","+endX+","+endY;

    // console.log(val);
    return val;

  }

  function brushed() {

    var extent0 = brush.extent(),
        extent1;

    // if dragging, preserve the width of the extent
    if (d3.event.mode === "move") {
      var d0 = d3.time.year.round(extent0[0]),
          d1 = d3.time.year.offset(d0, Math.round((extent0[1] - extent0[0]) / 864e5));
      extent1 = [d0, d1];
    }

    // otherwise, if resizing, round both dates
    else {
      extent1 = extent0.map(d3.time.year.round);

      // if empty when rounded, use floor & ceil instead
      if (extent1[0] >= extent1[1]) {
        extent1[0] = d3.time.year.floor(extent0[0]);
        extent1[1] = d3.time.year.ceil(extent0[1]);
      }
    }

    d3.select(this).call(brush.extent(extent1));
    updateBrush(extent1);
  }

}



function addDefs(svg) {
  var defs = svg.append('defs')

  var glow = defs.append('filter')
    .attr('id', 'shadow')
    .attr('x', '-20%')
    .attr('y', '-20%')
    .attr('width', '140%')
    .attr('height', '140%')

  glow.append('feGaussianBlur')
    .attr('stdDeviation', '3 3')
    .attr('result', 'glow')

  var feMerge = glow.append('feMerge')

  feMerge.append('feMergeNode').attr('in', 'glow')
  feMerge.append('feMergeNode').attr('in', 'glow')



}

function addWarStats(data) {
  data.burials.map(function(burialYear) {
    for(var war in data.wars) {
      if(burialYear[data.wars[war].war]) {
        if(!data.wars[war].total) {
          data.wars[war].total = 0;
        }
        data.wars[war].total += parseInt(burialYear[data.wars[war].war]);
      }
    }
  });
  console.log(data.wars);
}

function generateLineGraphData(burials) {
  var output = [];
  burials.map(function(year) {
    var birth = _.find(output, {"year" : year.birth})
    if(!birth) {
      birth = output.push({
        "year" : year.birth,
        "birth" : 0,
        "death" : 0
      })
    }
    var death = _.find(output, {"year" : year.death})
    if(!death) {
      death = output.push({
        "year" : year.death,
        "birth" : 0,
        "death" : 0
      })
    }

    birth.birth += parseInt(year.total);
    death.death += parseInt(year.total);

  })

  output.push({
    "year": "2020",
    "death": 0,
    "birth" : 0
  });

  return output;
}


//LineChart extends Chart

GeoDash.LineChart = ezoop.ExtendedClass(GeoDash.Chart, {
  className: 'LineChart',
  defaults: {
    x: 'x'
    , y: 'y'
    , width: 'auto'
    , height: 'auto'
    , colors: ['#d80000', '#006200']
    , interpolate: 'monotone'
    , dotRadius: 3
    , title: false
    , opacity: 0.8
    , strokeWidth: 2
    , drawX: true
    , drawY: true
    , xLabel: false
    , yLabel: false
    , xInterval: 'auto'
    , dashed: false
    , time: true
    , legendWidth: 80
    , legend: false
    , axisLabelPadding: 20
    , yaxisLabelPadding: 25
    , class: 'chart-html linechart vertical'
    , xFormat: d3.time.format("%Y-%m-%d")
    , hoverTemplate: "{{x}}: {{y}}"
    , formatter: d3.format(",")
    , outerPadding: 0
    , margin: {
      top: 10
      , right: 10
      , bottom: 10
      , left: 10
    }
  }
  , initialize: function (el, options) {
  }
  , update: function(data) {

    var self = this
      , y = this.options.y
      , x = this.options.x

    this.data = data

    var colordomain
    for(var i = 0; i < data.length; i++){
      if(typeof y == 'object') {
        this.stackNumber = y.length
        colordomain = y
      } else {
        this.stackNumber = 1
        colordomain = [y]
      }
    }

    this.color = d3.scale.ordinal()
      .range(this.options.colors)
      .domain(colordomain)

    this.linedata = []
    this.color.domain().map(function(name) {
      var values = []
      data.map(function(d) {
        var x = d[self.options.x]
          , y
        if(d[name] === null) {
          y = null
        } else {
          y = +d[name]
        }
        values.push({x: x, y: y})
      })
      var l = {
        name: name,
        values: values
      }
      self.linedata.push(l)
    })

    /*
      dashed: [{
        line: 0,
        span: {
          start: 0,
          howMany: 1
        }
      },{
        line: 1,
        span: {
          start: 0,
          howMany: 2
        }
      }]
    */
    if(this.options.dashed){
      this.options.dashed.forEach(function(dash_options, idx){
        var line = self.linedata[dash_options.line]
        if(typeof line !== 'undefined') {
          var linelength = line.values.length - 1
          var dashedline = {}
          dashedline.name = JSON.parse(JSON.stringify(line.name))
          dashedline.values = []
          dashedline.dashed = true
          var span = dash_options.span
          var end = span.start + span.howMany
          if(end > linelength) {
            end = linelength
          }
          for(var i = span.start; i <= end; i++) {
            dashedline.values.push({
              x: line.values[i].x,
              y: line.values[i].y
            })
          }
          if(span.start > 0) {
            var newline = {}
            newline.name = JSON.parse(JSON.stringify(line.name))
            newline.values = line.values.slice(0, span.start + 1)
            self.linedata.push(newline)
          }
          line.values = line.values.slice(span.start + span.howMany)
          self.linedata.push(dashedline)
        }
      })
    }
    
    //remove NaNs
    for(var i = 0; i < this.linedata.length; i++) {
      var one_line = []
      for(var j = 0; j < this.linedata[i].values.length; j++){
        var value = this.linedata[i].values[j].y
        if(!isNaN(value) && value !== null) one_line.push(this.linedata[i].values[j])
      }
      this.linedata[i].values = one_line
    }

    if(this.options.time){
      this.xLine = d3.time.scale()
        .range([0, this.xrange]);
    } else {
      this.xLine = d3.scale.linear()
        .range([0, this.xrange]);
    }
    this.xLine.domain(d3.extent(this.data, function(d) { return d[self.options.x] }))
    if(self.options.xInterval == 'auto') {
      this.xLine.ticks(data.length);
    } else {
      this.xLine.ticks(self.options.xInterval);
    }

    this.x.domain(this.xLine.ticks())

    this.y.domain([
      d3.min(this.linedata, function(c) { return d3.min(c.values, function(v) { return v.y; }) }),
      d3.max(this.linedata, function(c) { return d3.max(c.values, function(v) { return v.y; }) })
    ])

    var ydomain = this.y.domain()
    this.y.domain([
      ydomain[0] - ydomain[0]*.10,
      ydomain[1] + ydomain[1]*.10
    ])

    this.updateChart()
    this.updateXAxis()
    this.updateYAxis()
    this.updateLegend()

  }
  , updateChart: function() {
    var self = this

    this.line = d3.svg.line()
      .interpolate(this.options.interpolate)
      .x(function(d) { return self.x(d.x) + self.x.rangeBand()/2 })
      .y(function(d) { return self.y(d.y) })

    var delay = function(d, i) { return i * 10 }

    var line_groups = this.svg.selectAll(".line_group")
      .data(this.linedata)

    var lines = this.svg.selectAll(".line")
      .data(this.linedata)

    lines.transition()
      //.duration(500).delay(delay)
      .style("stroke", function(d) { return self.color(d.name) })
      .style("stroke-dasharray", function(d){
        if(d.dashed) return "5, 5"
        else return "none"
      })
      .attr("d", function(d) { return self.line(d.values); })

    lines.enter()
      .append("g")
      .attr('class', function(d, i){
        return 'line_group line_group' + i;
      })
      .append('path')
      .attr("class", "line")
      .attr("d", function(d) { return self.line(d.values); })
      .style("stroke", function(d) { return self.color(d.name); })
      .style("stroke-width", self.options.strokeWidth)
      .style("stroke-dasharray", function(d){
        if(d.dashed) return "5, 5";
        else return "none";
      })
      .style("stroke-opacity", self.options.opacity);

    var exitdots = lines.exit().selectAll('.dot');
    lines.exit().remove();
    line_groups.exit().remove();

    //dots
    for(var i = 0; i < this.linedata.length; i++) {
      var one_line = this.linedata[i].values;
      var dots = this.svg.select(".line_group" + i).selectAll('.dot')
          .data(one_line);

      dots.transition().duration(500).delay(delay)
        .attr("data", function(d){ return d.y; })
        .style("fill", function(d) { return self.color(self.linedata[i].name); })
        .attr("cx", function(d) { return self.x(d.x) + self.x.rangeBand()/2 })
        .attr("cy", function(d) { return self.y(d.y); });

      dots.enter().append("circle")
        .attr("class", "dot")
        .attr("r", this.options.dotRadius)
        .style("fill", function(d) { return self.color(self.linedata[i].name); })
        .style("fill-opacity", self.options.opacity)
        .attr("data", function(d){ return d.y; })
        .on('mouseover', function(d, i) {self.mouseOver(d, i, this); })
        .on('mouseout', function(d, i) {self.mouseOut(d, i, this); })
        .attr("cx", function(d) { return self.x(d.x) + self.x.rangeBand()/2 })
        .attr("cy", function(d) { return self.y(d.y); });

      dots.exit().remove();
    }
  }
  , mouseOver: function(d, i, el){
    var self = this
      , y = d.y
      , x = d.x
      , output = ''

    if(self.options.xFormat) {
      x = self.options.xFormat(x)
    }

    if(y !== null) {
      y = self.options.formatter(y)
      var view = {
        y: y
        , x: x
      }
      output = Mustache.render(self.options.hoverTemplate, view)
    } else {
      output = 'NA'
    }

    d3.select(el).transition().attr('r', this.options.dotRadius + 3)
    d3.select(el).style("fill-opacity", 0.9)

    self.container.select('.hoverbox')
      .html(output)

    self.container.select('.hoverbox')
      .transition()
      .style('display', 'block')
  }
  , mouseOut: function(d, i, el){
    var self = this;
    // d3.select(self.el).select('.hoverbox').transition().style('display', 'none');
    d3.select(el).style("fill-opacity", self.options.opacity)
    d3.select(el).transition().attr('r', this.options.dotRadius);
    self.container.select('.hoverbox')
      .transition()
      .style('display', 'none')
  }
});

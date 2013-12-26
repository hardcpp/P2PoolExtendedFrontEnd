function compose() {
  var funcs = arguments;
  return function(x) {
    for(var i = funcs.length-1; i >= 0; i--) {
      x = funcs[i](x);
    }
    return x;
  }
}

function itemgetter(i) { return function(x) { return x[i]; } }
function as_date(x) { return new Date(1000*x); }
function not_null(x) { return x != null; }

function get_area_mean(data) {
  var top = 0;
  var bottom = 0;
  for(var i = 0; i < data.length; i++) {
    if(data[i][1] == null) continue;
    top += data[i][1] * data[i][2];
    bottom += data[i][2];
  }
  return {"area": top, "mean": bottom==0?null:top/bottom};
}

function plot(g, unit, total_unit, lines,ww,hh,stack) {
  var table_div = document.createElement("div");
  g.node().parentNode.insertBefore(table_div, g.node().nextSibling);
  table_div.style.display = "none";

  for(var i = 0; i < lines.length; ++i) {
    var line = lines[i];
    var table_sel = d3.select(table_div).append('table').attr('border', 1).attr('style', 'float:left');
    
    var first_tr = table_sel.insert('tr');
    first_tr.append('th').text('Date');
    first_tr.append('th').text(line.label + '/(' + unit + ')');
    
    var new_data = []
    for(var j = 0; j < line.data.length; ++j) {
      if(j % 7 == 3) {
        new_data.push(line.data[j]);
      }
    }
    var tr = table_sel.selectAll().data(new_data).enter().append('tr');
    tr.append('td').text(function(datum){return new Date(1000*datum[0]).toString()});
    tr.append('td').text(function(datum){return d3.format(".3s")(datum[1])});
  }

  var margin_v = 40;
  var margin_h = 140;
  var w = ww;
  var h = hh;
  var x = d3.time.scale().domain([
    as_date(d3.min(lines, function(line) { return d3.min(line.data, itemgetter(0)); })),
    as_date(d3.max(lines, function(line) { return d3.max(line.data, itemgetter(0)); }))
  ]).range([0 + margin_h, w - margin_h]);

  g.attr("width", w).attr("height", h);
  g.selectAll("*").remove();

  if(stack) {           
    var data = d3.layout.stack()
      .x(itemgetter(0))
      .y(itemgetter(1))
      .values(function(line){ return line.data })
      (lines);

    var y = d3.scale.linear().domain([
      0,
      d3.max(data, function(d) { return d3.max(d.data, function(d) { return d.y0 + d.y; }) })
    ]).range([h - margin_v, margin_v]);

    var y_abs = d3.scale.linear().domain([0, 1]).range([h - margin_v, margin_v]);

    g.selectAll().data(lines).enter().append("svg:path")
      .attr("d", function(line){
        return d3.svg.area()
          .x(function(d) { return x(as_date(d[0])) })
          .y0(function(d) { return y(d.y0) })
          .y1(function(d) { return y(d.y0 + d.y) })
          .defined(compose(not_null, itemgetter(1)))
          (line.data)
      })
      .style("fill", function(line){return line.color})
      .attr("stroke", function(line){return line.color})
      .attr("class", "plotline");

    var total = 0;
    var total_area = 0;
    for(var i = 0; i < lines.length; ++i) {
      var line = lines[i];
      var stats = get_area_mean(line.data);
      if(stats.mean != null) {
        total += stats.mean;
        total_area += stats.area;
      }
    }

    for(var i = 0; i < lines.length; ++i) {
      var line = lines[i];
      var stats = get_area_mean(line.data);
      if(stats.mean != null) {
        var num = 0;
        var denom = 0;
        for(var j = 0; j < line.data.length; j++) {
          if(line.data[j] != null) {
            var d = line.data[j];
            num += (d.y+1)*((d.y0 + d.y) + (d.y0))/2;
            denom += (d.y+1);
          }
        }
        g.append("svg:line")
          .style("stroke", line.color)
          .attr("x1", w - margin_h + 3)
          .attr("y1", y(num/denom))
          .attr("x2", w - margin_h + 10)
          .attr("y2", y_abs(i/lines.length));
        g.append("svg:text")
          .text(line.label + " (mean: " + d3.format(".3s")(stats.mean) + unit + ")")
          .attr("text-anchor", "start")
          .attr("dominant-baseline", "central")
          .attr("fill", line.color)
          .attr("x", w - margin_h + 10)
          .attr("y", y_abs(i/lines.length));
        if(total_unit != null) {
          g.append("svg:text")
            .text("Area: " + d3.format(".3s")(stats.area) + total_unit + " (" + d3.format(".2p")(stats.area/total_area) + " total)")
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "central")
            .attr("fill", line.color)
            .attr("x", w - margin_h + 10)
            .attr("y", y_abs(i/lines.length) + 12);
        }
      }
    }
    g.append("svg:line")
      .style("stroke", "black")
      .attr("x1", w - margin_h + 3)
      .attr("y1", y(total))
      .attr("x2", w - margin_h + 10)
      .attr("y2", y_abs(1));
    g.append("svg:text")
      .text("Total (mean: " + d3.format(".3s")(total) + unit + ")")
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "central")
      .attr("fill", "black")
      .attr("x", w - margin_h + 10)
      .attr("y", y_abs(1));
    if(total_unit != null) {
      g.append("svg:text")
        .text("Area: " + d3.format(".3s")(total_area) + total_unit)
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "central")
        .attr("fill", "black")
        .attr("x", w - margin_h + 10)
        .attr("y", y_abs(1) + 12);
    }
  } else {
    var y = d3.scale.linear().domain([
      0,
      d3.max(lines, function(line) { return d3.max(line.data, itemgetter(1)); } )
    ]).range([h - margin_v, margin_v]);

    g.selectAll().data(lines).enter().append("svg:path")
      .attr("d", function(line) {
        return d3.svg.line()
          .x(compose(x, as_date, itemgetter(0)))
          .y(compose(y, itemgetter(1)))
          .defined(compose(not_null, itemgetter(1)))
          (line.data)
      })
      .style("stroke", function(line) { return line.color })
      .attr("class", "plotline");

    for(var i = 0; i < lines.length; ++i) {
      var line = lines[i];
      var stats = get_area_mean(line.data);
      if(stats.mean != null) {
        g.append("svg:text")
          .text(line.label)
          .attr("text-anchor", "start")
          .attr("dominant-baseline", "central")
          .attr("fill", line.color)
          .attr("x", w - margin_h + 10)
          .attr("y", y(stats.mean) - 12);
        g.append("svg:text")
          .text("-Mean: " + d3.format(".3s")(stats.mean) + unit)
          .attr("text-anchor", "start")
          .attr("dominant-baseline", "central")
          .attr("fill", line.color)
          .attr("x", w - margin_h)
          .attr("y", y(stats.mean));
        if(total_unit != null) {
          g.append("svg:text")
            .text("Area: " + d3.format(".3s")(stats.area) + total_unit)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "central")
            .attr("fill", line.color)
            .attr("x", w - margin_h + 10)
            .attr("y", y(stats.mean) + 12);
        }
      }
    }
  }

  // x axis
  g.append("svg:line")
    .attr("x1", margin_h)
    .attr("y1", h - margin_v)
    .attr("x2", w - margin_h)
    .attr("y2", h - margin_v);

  g.selectAll()
    .data(x.ticks(13))
    .enter().append("svg:g")
    .attr("transform", function(d) { return "translate(" + x(d) + "," + (h-margin_v/2) + ")"; })
    .append("svg:text")
    .attr("transform", "rotate(45)")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .text(x.tickFormat(13));

  g.selectAll()
    .data(x.ticks(13))
    .enter().append("svg:line")
    .attr("x1", x)
    .attr("y1", h - margin_v)
    .attr("x2", x)
    .attr("y2", h - margin_v + 5);

  // y axis
  g.append("svg:line")
    .attr("x1", margin_h)
    .attr("y1", h - margin_v)
    .attr("x2", margin_h)
    .attr("y2", margin_v);

  g.selectAll()
    .data(y.ticks(6))
    .enter().append("svg:line")
    .attr("x1", margin_h - 5)
    .attr("y1", y)
    .attr("x2", margin_h)
    .attr("y2", y);

  g.selectAll()
    .data(y.ticks(6))
    .enter().append("svg:text")
    .text(compose(function(x) { return x + unit; }, d3.format(".2s")))
    .attr("x", margin_h/2)
    .attr("y", y)
    .attr("dominant-baseline", "central")
    .attr("text-anchor", "middle");
}

function plot_later(g, unit, total_unit, lines,w,h,stack) {
  var callbacks_left = lines.length;
  lines.map(function(line) {
    d3.json(line.url, function(line_data) {
      line.data = line_data;
      callbacks_left--;
      if(callbacks_left == 0) {
        plot(g, unit, total_unit, lines,w,h,stack);
      }
    });
  });
}

function data_to_lines(data, sort_key) {
  var vers = {}; for(var i = 0; i < data.length; ++i) if(data[i][1] != null) for(var v in data[i][1]) if(data[i][1][v] != data[i][3]) vers[v] = null;
  var verlist = []; for(var v in vers) verlist.push(v);
  verlist.sort();
  
  lines = [];
  for(var i = 0; i < verlist.length; i++) {
    lines.push({
      data: data.map(function(d){ return [d[0], d[1] == null ? null : (verlist[i] in d[1] ? d[1][verlist[i]] : d[3]), d[2]] }),
      color: d3.hsl(i/verlist.length*360, 0.5, 0.5),
      label: verlist[i]
    });
  }
  if(sort_key == undefined) {
    var sort_key = function(x) { return d3.max(x.data, function(d){ return d[1] }) }
  }
  lines.sort(function(a, b){ return sort_key(a) - sort_key(b) });
  return lines;
}